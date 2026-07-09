import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

try {
  const env = loadEnv();
  const app = createApp(env);

  app.listen(env.PORT, () => {
    console.info(`GrowEasy API listening on http://localhost:${env.PORT}`);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exit(1);
}
