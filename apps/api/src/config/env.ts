import { z } from "zod";

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .default(true)
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    return !["0", "false", "no", "off"].includes(value.toLowerCase());
  });

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  JSON_BODY_LIMIT: z.string().min(1).default("1mb"),
  LOG_REQUESTS: booleanFromEnv,
  MAX_CSV_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  AI_PROVIDER: z.enum(["mock", "openai", "gemini", "claude"]).default("mock"),
  AI_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(25),
  AI_BATCH_RETRY_LIMIT: z.coerce.number().int().min(0).max(5).default(1),
  AI_API_KEY: optionalSecret
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "environment";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}
