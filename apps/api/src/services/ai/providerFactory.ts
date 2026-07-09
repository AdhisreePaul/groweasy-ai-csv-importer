import type { Env } from "../../config/env.js";
import type { AiProvider } from "./aiProvider.interface.js";
import { OpenAiProvider } from "./openaiProvider.js";

export function createAiProvider(env: Env): AiProvider {
  return new OpenAiProvider({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL
  });
}
