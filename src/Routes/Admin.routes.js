import express from "express";
import multer from "multer";
const upload = multer();
import {
  createAdmin,
  loginAdmin,
  addUserAndSendPasskey,
  verifyForgotPasswordOtp,
  resetAdminPassword
} from "../Controllers/Admin.controller.js";

const router = express.Router();

router.post("/register", createAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", upload.none(), addUserAndSendPasskey);
router.post("/verify-otp", upload.none(), verifyForgotPasswordOtp);
router.post("/reset-password", upload.none(), resetAdminPassword);

export default router;
