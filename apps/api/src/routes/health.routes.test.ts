import { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../app.js";
import { loadEnv } from "../config/env.js";

describe("health route", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "4000",
      CORS_ORIGIN: "http://localhost:3000",
      JSON_BODY_LIMIT: "1mb",
      LOG_REQUESTS: "false"
    });

    await new Promise<void>((resolve) => {
      server = createApp(env).listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("returns status ok", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as { status: string; service: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      service: "groweasy-api"
    });
  });
});

describe("environment validation", () => {
  it("fails clearly for invalid env values", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "development",
        PORT: "not-a-port",
        CORS_ORIGIN: "http://localhost:3000"
      })
    ).toThrow(/Invalid environment configuration/);
  });
});
