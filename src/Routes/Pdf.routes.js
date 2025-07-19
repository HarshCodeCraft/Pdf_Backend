import { Router } from "express";
import {
  PdfAdd,
  PdfView,
  deletePdfById,
  accessPdfByUser,
  addIpToPdf,
  getSinglePdfData,
} from "../Controllers/Pdf.controller.js";
import { upload } from "../Middlewares/multer.middleware.js";
import multer from "multer";
const formate = multer();

const router = Router();

// POST: Upload PDF with metadata
router.post("/upload", upload.single("pdf"), PdfAdd);
router.get("/view", PdfView);
router.get("/details", PdfView);
router.put("/add-ip/:id", formate.none(), addIpToPdf);
router.delete("/delete/:id", deletePdfById);
router.post("/access/:pdfId", accessPdfByUser);
router.post("/view-one/:id", getSinglePdfData);
router.get("/ip", (req, res) => {
  console.log("HEADERS:", req.headers);
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  res.json({ ip });
});

export default router;
