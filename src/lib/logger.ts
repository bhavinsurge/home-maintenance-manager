import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "home-maintenance-manager" },
  redact: {
    paths: [
      "password",
      "passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "token",
      "refreshToken",
      "accessToken",
    ],
    remove: true,
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
});
