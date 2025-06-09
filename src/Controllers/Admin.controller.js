import { Admin } from "../Models/Admin.model.js";
import { fileURLToPath } from "url";
import path from "path";
import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Create Admin
export const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = new Admin({ email, password: hashedPassword });
    await newAdmin.save();

    res
      .status(201)
      .json({ message: "Admin created successfully", adminId: newAdmin._id });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating admin", error: error.message });
  }
};

// Admin Login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Login success (no token, just confirmation)
    res
      .status(200)
      .json({
        message: "Login successful",
        data: { id: admin._id, email: email },
      });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.use(
  "compile",
  hbs({
    viewEngine: {
      extname: ".hbs",
      partialsDir: path.join(__dirname, "Views"),
      defaultLayout: false,
    },
    viewPath: path.join(__dirname, "Views"),
    extName: ".hbs",
  })
);

const sendEmail = async (email, subject, template, context) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    template,
    context,
  };

  await transporter.sendMail(mailOptions);
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// This function handles creating or updating a user with the OTP and sending email
export const addUserAndSendPasskey = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const generatedOtp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    // Save OTP and expiry in DB
    admin.otp = generatedOtp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    // Send OTP email
    await sendEmail(email, "Your OTP Code", "users-verification", {
      email: email,
      otp: generatedOtp,
    });

    res.status(201).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify OTP entered by Admin
export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > admin.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // OTP valid
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetAdminPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required" });
  }

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  admin.password = await bcrypt.hash(newPassword, 10);
  admin.otp = null;
  admin.otpExpiry = null;

  await admin.save();
  res.status(200).json({ message: "Password reset successful" });
};