import OpenAI from "openai";
import { AppError } from "../../errors/AppError.js";
import type {
  AiBatchRequest,
  AiPromptMessages,
  AiProvider
} from "./aiProvider.interface.js";

const DEFAULT_OPENAI_MODEL = "gpt-4.1-nano";

export interface OpenAiProviderOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly client: OpenAI;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = normalizeSecret(options.apiKey);
    this.model = options.model?.trim() || DEFAULT_OPENAI_MODEL;
    this.client = new OpenAI({
      apiKey: this.apiKey,
      maxRetries: 0,
      timeout: 30_000
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
          "AI_PROVIDER=openai requires OPENAI_API_KEY to be configured on the backend.",
        statusCode: 500
      });
    }

    try {
      const completion = await this.client.chat.completions.create({
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
        code: "AI_PROVIDER_FAILURE",
        message: "OpenAI provider request failed.",
        statusCode: 502
      });
    }
  }
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
