import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import PdfRouter from "./Routes/Pdf.routes.js"
import UserRoutes from "./Routes/Users.routes.js"
import AdminRoutes from "./Routes/Admin.routes.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config();
import fs from 'fs';

app.get('/.well-known/assetlinks.json', (req, res) => {
  const assetLinksPath = path.resolve(__dirname, '../public/.well-known/assetlinks.json');
  console.log("Serving assetlinks.json from:", assetLinksPath);

  if (!fs.existsSync(assetLinksPath)) {
    console.error("❌ File not found at:", assetLinksPath);
    return res.status(404).json({ error: "assetlinks.json not found" });
  }

  res.setHeader('Content-Type', 'application/json');
  res.sendFile(assetLinksPath);
});

app.use(express.static(path.join(__dirname, "../public"))); 

app.set('trust proxy', true);

app.use(cors({
  origin: [ "https://ip.mgcem.com", "http://localhost:5173" ],
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}));

app.use(cookieParser());

app.use("/api/v1/pdf", PdfRouter);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);

export { app }

// there is add a comment to check to git commit