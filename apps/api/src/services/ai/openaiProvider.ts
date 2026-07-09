import OpenAI from "openai";
import { AppError } from "../../errors/AppError.js";
import type { AiBatchRequest, AiPromptMessages, AiProvider } from "./aiProvider.interface.js";

const DEFAULT_OPENAI_MODEL = "gpt-4.1-nano";

export interface OpenAiProviderOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private client: OpenAI | undefined;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = normalizeSecret(options.apiKey);
    this.model = options.model?.trim() || DEFAULT_OPENAI_MODEL;
  }

  async extractBatch(_request: AiBatchRequest, prompt: AiPromptMessages): Promise<string> {
    if (!this.apiKey) {
      throw new AppError({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: "AI_PROVIDER=openai requires OPENAI_API_KEY to be configured on the backend.",
        statusCode: 500
      });
    }

    try {
      const completion = await this.getClient().chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: prompt.system
          },
          {
            role: "user",
            content: prompt.user
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      });

      const text = completion.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new AppError({
          code: "AI_OUTPUT_INVALID",
          message: "OpenAI response did not include message text.",
          statusCode: 502
        });
      }

      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError({
        code: getOpenAiErrorCode(error),
        message: getOpenAiErrorMessage(error),
        statusCode: 502
      });
    }
  }

  private getClient(): OpenAI {
    this.client ??= new OpenAI({
      apiKey: this.apiKey,
      maxRetries: 0,
      timeout: 30_000
    });

    return this.client;
  }
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !isExampleSecret(trimmed) ? trimmed : undefined;
}

function isExampleSecret(value: string): boolean {
  return ["your_openai_api_key_here", "your_api_key_here", "replace_me"].includes(
    value.toLowerCase()
  );
}

function getOpenAiErrorCode(error: unknown): string {
  if (hasStringProperty(error, "name", "APIConnectionTimeoutError")) {
    return "AI_PROVIDER_TIMEOUT";
  }

  if (hasStatus(error, 401) || hasStatus(error, 403)) {
    return "AI_PROVIDER_AUTH_FAILED";
  }

  if (hasStatus(error, 429)) {
    return "AI_PROVIDER_RATE_LIMITED";
  }

  return "AI_PROVIDER_FAILURE";
}

function getOpenAiErrorMessage(error: unknown): string {
  if (hasStringProperty(error, "name", "APIConnectionTimeoutError")) {
    return "OpenAI request timed out. Please retry the import.";
  }

  if (hasStatus(error, 401) || hasStatus(error, 403)) {
    return "OpenAI rejected the backend credentials or permissions.";
  }

  if (hasStatus(error, 429)) {
    return "OpenAI rate limit was reached. Please retry shortly.";
  }

  return "OpenAI provider request failed.";
}

function hasStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" && error !== null && "status" in error && error.status === status
  );
}

function hasStringProperty(error: unknown, property: string, value: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    property in error &&
    error[property as keyof typeof error] === value
  );
}
