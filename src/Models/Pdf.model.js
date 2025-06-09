import mongoose from "mongoose";

// const pdfSchema = new mongoose.Schema(
//   {
//     filePath: {
//       type: String,
//       required: true,
//     },
//     expiryTime: {
//       type: Date,
//       required: true,
//     },
//     userLimit: {
//       type: Number,
//       required: true,
//     },
//     uploadedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Admin",
//     },
//   },
//   { timestamps: true }
// );
const PdfSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    expiryTime: { type: Date },
    userLimit: { type: Number, default: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    
    accessList: [
      {
        ip: { type: String },
        deviceId: { type: String },
        accessedAt: { type: Date, default: Date.now },
      },
    ],

    viewers: [
      {
        email: { type: String, required: true },
        viewedAt: { type: Date, default: Date.now },
        ip: String,
      },
    ],

    ipAddresses: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const Pdf = mongoose.model("Pdf", PdfSchema);
