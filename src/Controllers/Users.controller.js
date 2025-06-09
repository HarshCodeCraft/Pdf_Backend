// import { fileURLToPath } from "url";
// import path from "path";
// import nodemailer from "nodemailer";
// import hbs from "nodemailer-express-handlebars";
// import dotenv from "dotenv";
// import crypto from "crypto";
// import { Users } from "../Models/Users.model.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// transporter.use(
//   "compile",
//   hbs({
//     viewEngine: {
//       extname: ".hbs",
//       partialsDir: path.join(__dirname, "Views"),
//       defaultLayout: false,
//     },
//     viewPath: path.join(__dirname, "Views"),
//     extName: ".hbs",
//   })
// );

// const sendEmail = async (email, subject, template, context) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject,
//     template,
//     context,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// export const addUserAndSendPasskey = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) return res.status(400).json({ message: "Email is required" });

//     // Generate passkey (if you still want to keep it)
//     const passkey = crypto.randomBytes(16).toString("hex");

//     // Generate 6-digit OTP
//     const generatedOtp = generateOTP();

//     const otpExpiry = Date.now() + 5 * 60 * 1000;
//     // Save user with passkey and otp (add otp field in your schema if needed)
//     const user = new Users({
//       Email: email,
//       passkey,
//       otp: generatedOtp,
//       otpExpiry,
//     });
//     await user.save();

//     // Send email with OTP in template context
//     await sendEmail(email, "Your OTP Code", "users-verification", {
//       userEmail: email,
//       otp: generatedOtp,
//     });

//     res.status(201).json({ message: "User created and email sent", user });
//   } catch (error) {
//     console.error("Error in addUserAndSendPasskey:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // POST /users/verify-otp
// export const verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp)
//       return res.status(400).json({ message: "Email and OTP are required" });

//     const user = await Users.findOne({ Email: email });

//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.otp !== otp)
//       return res.status(400).json({ message: "Invalid OTP" });

//     if (user.otpExpiry && user.otpExpiry < Date.now())
//       return res.status(400).json({ message: "OTP has expired" });

//     // Optionally mark OTP as used or verified
//     user.otp = null;
//     user.otpExpiry = null;
//     user.isVerified = true; // optional
//     await user.save();

//     res.status(200).json({ message: "OTP verified successfully" });
//   } catch (error) {
//     console.error("OTP verification failed:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };








import { fileURLToPath } from "url";
import path from "path";
import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import dotenv from "dotenv";
import crypto from "crypto";
import { Users } from "../Models/Users.model.js";

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

    // Generate passkey (optional)
    const passkey = crypto.randomBytes(16).toString("hex");

    // Generate 6-digit OTP
    const generatedOtp = generateOTP();

    // OTP expiry time (5 minutes from now)
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    // Update existing user or create new with OTP & passkey
    const user = await Users.findOneAndUpdate(
      { Email: email },
      {
        Email: email,
        passkey,
        otp: generatedOtp,
        otpExpiry,
        isVerified: false,
      },
      { new: true, upsert: true }
    );

    // Send OTP email
    await sendEmail(email, "Your OTP Code", "users-verification", {
      userEmail: email,
      otp: generatedOtp,
    });

    res.status(201).json({ message: "OTP sent to email", user });
  } catch (error) {
    console.error("Error in addUserAndSendPasskey:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("OTP verification request for email:", email, "OTP:", otp);

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const user = await Users.findOne({ Email: email });
    console.log("User found:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("Stored OTP:", user.otp, "Expiry:", user.otpExpiry, "Now:", Date.now());

    if (String(user.otp) !== String(otp))
      return res.status(400).json({ message: "Invalid OTP or Email" });

    if (user.otpExpiry && user.otpExpiry < Date.now())
      return res.status(400).json({ message: "OTP has expired" });

    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification failed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Verify OTP route
// export const verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     console.log("Verify OTP request:", { email, otp });

//     if (!email || !otp)
//       return res.status(400).json({ message: "Email and OTP are required" });

//     const user = await Users.findOne({ Email: email, otp: otp });

//     console.log("Found user:", user);

//     if (!user) return res.status(400).json({ message: "Invalid OTP or Email" });

//     if (user.otpExpiry < Date.now())
//       return res.status(400).json({ message: "OTP has expired" });

//     user.otp = null;
//     user.otpExpiry = null;
//     user.isVerified = true;
//     await user.save();

//     res.status(200).json({ message: "OTP verified successfully" });
//   } catch (error) {
//     console.error("OTP verification failed:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };


// export const AddUser = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   const user = new Users({ Email: email });
//   await user.save();
//   res.status(201).json({ message: "User added successfully", user });
// };
