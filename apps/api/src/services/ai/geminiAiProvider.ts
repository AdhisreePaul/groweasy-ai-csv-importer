import { AppError } from "../../errors/AppError.js";
import type {
  AiBatchRequest,
  AiPromptMessages,
  AiProvider
} from "./aiProvider.interface.js";

export interface GeminiGenerateContentRequest {
  systemInstruction: {
    parts: Array<{ text: string }>;
  };
  contents: Array<{
    role: "user";
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    responseMimeType: "application/json";
    temperature: number;
    candidateCount: number;
  };
}

interface GeminiTextPart {
  text?: unknown;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiTextPart[];
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface GeminiClient {
  generateContent(request: GeminiGenerateContentRequest): Promise<unknown>;
}

export interface GeminiAiProviderOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number | undefined;
  client?: GeminiClient;
}

export type GeminiFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly apiKey: string | undefined;
  private readonly client: GeminiClient;

  constructor(options: GeminiAiProviderOptions) {
    this.apiKey = normalizeSecret(options.apiKey);
    this.client =
      options.client ??
      new GeminiRestClient({
        apiKey: this.apiKey,
        model: options.model ?? DEFAULT_GEMINI_MODEL,
        timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      });
  }

  async extractBatch(
    _request: AiBatchRequest,
    prompt: AiPromptMessages
  ): Promise<string> {
    if (!this.apiKey) {
      throw new AppError({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message:
          "AI_PROVIDER=gemini requires AI_API_KEY or GEMINI_API_KEY to be configured on the backend.",
        statusCode: 500
      });
    }

    const response = await this.client.generateContent({
      systemInstruction: {
        parts: [{ text: prompt.system }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt.user }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        candidateCount: 1
      }
    });

    return extractGeminiText(response);
  }
}

export class GeminiRestClient implements GeminiClient {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: GeminiFetch;

  constructor({
    apiKey,
    model,
    timeoutMs,
    fetchImpl = fetch
  }: {
    apiKey: string | undefined;
    model: string;
    timeoutMs: number;
    fetchImpl?: GeminiFetch;
  }) {
    this.apiKey = apiKey;
    this.model = normalizeModel(model);
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async generateContent(request: GeminiGenerateContentRequest): Promise<unknown> {
    if (!this.apiKey) {
      throw new AppError({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message:
          "Gemini API key is missing. Set AI_API_KEY or GEMINI_API_KEY on the backend.",
        statusCode: 500
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
      );
      endpoint.searchParams.set("key", this.apiKey);

      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new AppError({
          code: "AI_PROVIDER_FAILURE",
          message: buildGeminiFailureMessage(response.status, body),
          statusCode: response.status >= 500 ? 502 : 500
        });
      }

      return body;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new AppError({
          code: "AI_PROVIDER_TIMEOUT",
          message: `Gemini provider timed out after ${this.timeoutMs}ms.`,
          statusCode: 504
        });
      }

      throw new AppError({
        code: "AI_PROVIDER_FAILURE",
        message: "Gemini provider request failed.",
        statusCode: 502
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function extractGeminiText(response: unknown): string {
  const parsed = response as GeminiGenerateContentResponse | null;
  const textParts =
    parsed?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part.text === "string" ? part.text : ""))
      .filter(Boolean) ?? [];
  const text = textParts.join("").trim();

  if (!text) {
    throw new AppError({
      code: "AI_OUTPUT_INVALID",
      message: "Gemini response did not include candidate text.",
      statusCode: 502
    });
  }

  return text;
}

function buildGeminiFailureMessage(status: number, body: unknown): string {
  const maybeBody = body as GeminiGenerateContentResponse | null;
  const providerMessage = maybeBody?.error?.message;

  if (providerMessage) {
    return `Gemini provider failed with HTTP ${status}: ${providerMessage}`;
  }

  return `Gemini provider failed with HTTP ${status}.`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeModel(value: string): string {
  return value.trim().replace(/^models\//, "");
}
