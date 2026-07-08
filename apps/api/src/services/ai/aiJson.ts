import { AppError } from "../../errors/AppError.js";

export function parseAiJsonResponse(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new AppError({
      code: "AI_OUTPUT_INVALID",
      message: "AI output must be a strict JSON object with no surrounding prose.",
      statusCode: 502
    });
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const repaired = repairJsonIfSafe(trimmed);

    if (repaired) {
      try {
        return JSON.parse(repaired) as unknown;
      } catch {
        // Fall through to the controlled parse error below.
      }
    }

    throw new AppError({
      code: "AI_OUTPUT_INVALID",
      message: "AI output could not be parsed as JSON.",
      statusCode: 502
    });
  }
}

export const parseStrictJson = parseAiJsonResponse;

function repairJsonIfSafe(value: string): string | null {
  const withoutTrailingCommas = value.replace(/,\s*([}\]])/g, "$1");

  if (withoutTrailingCommas !== value) {
    return withoutTrailingCommas;
  }

  return null;
}
