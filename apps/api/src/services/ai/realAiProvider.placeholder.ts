import { AppError } from "../../errors/AppError.js";
import type {
  AiBatchRequest,
  AiPromptMessages,
  AiProvider
} from "./aiProvider.interface.js";

export class RealAiProviderPlaceholder implements AiProvider {
  readonly name: string;
  private readonly apiKey: string | undefined;

  constructor(name: string, apiKey?: string) {
    this.name = name;
    this.apiKey = apiKey;
  }

  async extractBatch(
    _request: AiBatchRequest,
    _prompt: AiPromptMessages
  ): Promise<string> {
    throw new AppError({
      code: "AI_PROVIDER_NOT_CONFIGURED",
      message: this.apiKey
        ? `AI provider '${this.name}' is selected, but the real provider adapter has not been implemented yet.`
        : `AI provider '${this.name}' requires AI_API_KEY to be configured on the backend.`,
      statusCode: 501
    });
  }
}
