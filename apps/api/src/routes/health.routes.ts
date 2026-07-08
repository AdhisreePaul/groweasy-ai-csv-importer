import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "groweasy-api",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime())
  });
});
