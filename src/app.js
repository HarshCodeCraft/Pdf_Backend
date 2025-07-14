import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Route imports
import PdfRouter from "./Routes/Pdf.routes.js";
import UserRoutes from "./Routes/Users.routes.js";
import AdminRoutes from "./Routes/Admin.routes.js";

// Init
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust reverse proxy (for secure cookies)
app.set('trust proxy', true);

// CORS setup
app.use(cors({
  origin: ["https://ip.mgcem.com", "http://localhost:5173"],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// API Routes
app.use("/api/v1/pdf", PdfRouter);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);

// Serve assetlinks.json from correct public path
app.get('/.well-known/assetlinks.json', (req, res) => {
  const assetLinksPath = path.resolve(__dirname, '../public/.well-known/assetlinks.json');
  console.log("🔗 Serving assetlinks.json from:", assetLinksPath);

  if (!fs.existsSync(assetLinksPath)) {
    console.error("❌ assetlinks.json not found");
    return res.status(404).json({ error: "assetlinks.json not found" });
  }

res.status(200).type('application/json').sendFile(assetLinksPath);

});

// Static frontend serving (React build)
app.use(express.static(path.join(__dirname, "../public")));

// Fallback for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Export app for server start
export { app };
