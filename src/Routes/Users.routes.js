import multer from "multer";
const upload = multer();
import { Router } from "express";
import {
  addUserAndSendPasskey,
  verifyOtp,
} from "../Controllers/Users.controller.js";

const router = Router();

// POST: Upload PDF with metadata
router.post("/add", upload.none(), addUserAndSendPasskey);
router.post("/verify-otp",upload.none(), verifyOtp);

export default router;
