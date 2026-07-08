import { describe, expect, it } from "vitest";
import {
  GeminiAiProvider,
  GeminiRestClient,
  type GeminiClient,
  type GeminiGenerateContentRequest
} from "./geminiAiProvider.js";

describe("GeminiAiProvider", () => {
  it("sends system and user prompts and returns raw model text", async () => {
    const client = new FakeGeminiClient({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  importedRecords: [],
                  skippedRecords: []
                })
              }
            ]
          }
        }
      ]
    });
    const provider = new GeminiAiProvider({
      apiKey: "test-key",
      client
    });

    const result = await provider.extractBatch(
      { batch_id: "batch-1", records: [] },
      { system: "system prompt", user: "user prompt" }
    );

    expect(result).toBe('{"importedRecords":[],"skippedRecords":[]}');
    expect(client.lastRequest).toMatchObject({
      systemInstruction: {
        parts: [{ text: "system prompt" }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: "user prompt" }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        candidateCount: 1
      }
    });
  });

  it("fails clearly when Gemini is selected without a backend API key", async () => {
    const provider = new GeminiAiProvider({
      apiKey: "",
      client: new FakeGeminiClient({})
    });

    await expect(
      provider.extractBatch(
        { batch_id: "batch-1", records: [] },
        { system: "system", user: "user" }
      )
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_NOT_CONFIGURED",
      message:
        "AI_PROVIDER=gemini requires AI_API_KEY or GEMINI_API_KEY to be configured on the backend."
    });
  });

  it("fails clearly when Gemini returns no text candidate", async () => {
    const provider = new GeminiAiProvider({
      apiKey: "test-key",
      client: new FakeGeminiClient({ candidates: [] })
    });

    await expect(
      provider.extractBatch(
        { batch_id: "batch-1", records: [] },
        { system: "system", user: "user" }
      )
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
      message: "Gemini response did not include candidate text."
    });
  });
});

describe("GeminiRestClient", () => {
  it("calls the Gemini generateContent REST endpoint", async () => {
    let requestedUrl = "";
    let requestedBody: unknown;
    const client = new GeminiRestClient({
      apiKey: "test-key",
      model: "models/gemini-test",
      timeoutMs: 1000,
      fetchImpl: async (input, init) => {
        requestedUrl = input.toString();
        requestedBody = JSON.parse(String(init?.body)) as unknown;

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "{}" }]
                }
              }
            ]
          }),
          { status: 200 }
        );
      }
    });

    await client.generateContent({
      systemInstruction: { parts: [{ text: "system" }] },
      contents: [{ role: "user", parts: [{ text: "user" }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        candidateCount: 1
      }
    });

    expect(requestedUrl).toContain(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
    );
    expect(requestedUrl).toContain("key=test-key");
    expect(requestedBody).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
  });

  it("wraps Gemini HTTP errors as controlled provider failures", async () => {
    const client = new GeminiRestClient({
      apiKey: "test-key",
      model: "gemini-test",
      timeoutMs: 1000,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "API key not valid."
            }
          }),
          { status: 400 }
        )
    });

    await expect(validGenerateContent(client)).rejects.toMatchObject({
      code: "AI_PROVIDER_FAILURE",
      message: "Gemini provider failed with HTTP 400: API key not valid."
    });
  });

  it("wraps request aborts as controlled timeout errors", async () => {
    const client = new GeminiRestClient({
      apiKey: "test-key",
      model: "gemini-test",
      timeoutMs: 1000,
      fetchImpl: async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }
    });

    await expect(validGenerateContent(client)).rejects.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
      message: "Gemini provider timed out after 1000ms."
    });
  });

  it("fails before fetch when the API key is missing", async () => {
    const client = new GeminiRestClient({
      apiKey: undefined,
      model: "gemini-test",
      timeoutMs: 1000,
      fetchImpl: async () => {
        throw new Error("fetch should not run");
      }
    });

    await expect(validGenerateContent(client)).rejects.toMatchObject({
      code: "AI_PROVIDER_NOT_CONFIGURED",
      message:
        "Gemini API key is missing. Set AI_API_KEY or GEMINI_API_KEY on the backend."
    });
  });
});

class FakeGeminiClient implements GeminiClient {
  lastRequest: GeminiGenerateContentRequest | null = null;

  constructor(private readonly response: unknown) {}

  async generateContent(
    request: GeminiGenerateContentRequest
  ): Promise<unknown> {
    this.lastRequest = request;
    return this.response;
  }
}

function validGenerateContent(client: GeminiRestClient): Promise<unknown> {
  return client.generateContent({
    systemInstruction: { parts: [{ text: "system" }] },
    contents: [{ role: "user", parts: [{ text: "user" }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
      candidateCount: 1
    }
  });
}
