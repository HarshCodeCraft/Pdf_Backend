import mongoose from "mongoose";

const UsersSchema = new mongoose.Schema(
  {
    Email: { type: String, required: true },
    otp: String,
    otpExpiry: Date,
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Users = mongoose.model("Users", UsersSchema);
