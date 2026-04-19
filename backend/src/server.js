import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { ZodError } from "zod";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import favoriteRoutes from "./routes/favorites.js";
import chatRoutes from "./routes/chats.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HAWKIFY Clone API',
      version: '1.0.0',
      description: 'API documentation for HAWKIFY Clone application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow multiple origins via a CSV in CLIENT_ORIGIN (example: "http://localhost:5173,https://olete.in")
const rawClientOrigin = process.env.CLIENT_ORIGIN || "";
const allowedOrigins = rawClientOrigin.split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // if no origins are configured, reject browser requests
    if (allowedOrigins.length === 0) return callback(new Error("CORS: origin not allowed"), false);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS: origin not allowed"), false);
  },
  credentials: true,
}));

app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Each image must be 10MB or smaller." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "You can upload up to 10 images." });
    }
    return res.status(400).json({ error: "File upload failed." });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'none'}`);
});
