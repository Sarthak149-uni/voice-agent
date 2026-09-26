import "dotenv/config";
import express from "express";

import authRouter from "./Routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import userRouter from "./Routes/user.route.js";
import assistantRouter from "./Routes/assistant.route.js";
import billingRouter from "./Routes/billing.route.js";
import {
  authLimiter,
  assistantLimiter,
  generalLimiter,
} from "./Middleware/rateLimiter.js";

const app = express();

// ── Security Headers ──
app.use(helmet());

// ── Compression ──
app.use(compression());

// ── Request Logging ──
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── CORS Configuration ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const privateCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});

const publicCors = cors({
  origin: "*",
});

// ── Body Parsing ──
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ── General Rate Limiter ──
app.use(generalLimiter);

// ── Health Check ──
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ message: "ElliraAI API Server", version: "1.0.0" });
});

// ── Routes ──
app.use("/api/auth", privateCors, authLimiter, authRouter);
app.use("/api/user", privateCors, userRouter);
app.use("/api/billing", privateCors, billingRouter);
app.use("/api/assistant", publicCors, assistantLimiter, assistantRouter);

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// ── Start Server ──
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`
  );
});

// ── Graceful Shutdown ──
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));