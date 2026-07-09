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
    return trimmed && !isExampleSecret(trimmed) ? trimmed : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  JSON_BODY_LIMIT: z.string().min(1).default("1mb"),
  LOG_REQUESTS: booleanFromEnv,
  MAX_FILE_SIZE_MB: z.coerce.number().positive().max(100).default(5),
  AI_PROVIDER: z.literal("openai").default("openai"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-nano"),
  OPENAI_API_KEY: optionalSecret,
  BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(25),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2)
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

function isExampleSecret(value: string): boolean {
  return ["your_openai_api_key_here", "your_api_key_here", "replace_me"].includes(
    value.toLowerCase()
  );
}
