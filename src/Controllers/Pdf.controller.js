import { Pdf } from "../Models/Pdf.model.js";
import { Users } from "../Models/Users.model.js";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";
import requestIp from "request-ip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PdfDirect = async (req, res) => {
  const { id } = req.params;
  const deviceId = req.query.deviceId || "unknown";
  const ip = requestIp.getClientIp(req) || "unknown";

  console.log("👉 ID:", id);
  console.log("📱 Device ID:", deviceId);
  console.log("📡 IP:", ip);

  const doc = await Pdf.findById(id);
  if (!doc) return res.status(404).send("PDF not found");

  if (doc.expiryTime && new Date() > doc.expiryTime) {
    return res.status(403).send("PDF link has expired");
  }

  if (doc.ipAddresses.length > 0 && !doc.ipAddresses.includes(ip)) {
    return res.status(403).send("Access denied from this IP");
  }

  const existingAccess = doc.accessList.find(
    (a) => a.deviceId === deviceId && a.ip === ip
  );

  if (!existingAccess) {
    if (doc.accessList.length >= doc.userLimit) {
      return res.status(403).send("User limit exceeded");
    }

    doc.accessList.push({ ip, deviceId, accessedAt: new Date() });
    await doc.save();
  } else {
    // Optional: update accessedAt if re-opening
    existingAccess.accessedAt = new Date();
    await doc.save();
  }

  const filePath = path.join(__dirname, "..", "..", "public", doc.filePath);
  console.log("📄 Sending file from:", filePath);
  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("❌ Error sending file:", err);
      res.status(500).send("Failed to send PDF");
    }
  });
};

// Add PDF Controller
// export const PdfAdd = async (req, res) => {
//   try {
//     const { expiryTime, allowedIPs, otp, otpExpires,userLimit  } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ message: "PDF file is required!" });
//     }

//     const filePath = `/uploads/${req.file.filename}`;
//     const allowedIPsArray = allowedIPs
//       ? allowedIPs.split(",").map((ip) => ip.trim())
//       : [];

//     const newPdf = new Pdf({
//       filePath,
//       expiryTime,
//       allowedIPs: allowedIPsArray,
//       otp,
//       otpExpires,
//       userLimit,
//       uploadedBy: req.user?._id || null,
//     });

//     await newPdf.save();

//     res.status(201).json({
//       message: "PDF uploaded successfully",
//       data: newPdf,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// Add PDF Controller
export const PdfAdd = async (req, res) => {
  try {
    const { expiryTime, userLimit } = req.body;
    console.log("Files received:", req.file);
    console.log("Body:", req.body);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("Uploaded File:", req.file);

    const filePath = `/uploads/${req.file.filename}`;

    const expiryUTC = new Date(expiryTime);

    const newPdf = new Pdf({
      filePath,
      expiryTime:expiryUTC,
      userLimit,
      uploadedBy: req.user?._id || null,
    });

    await newPdf.save();

    return res.status(201).json({
      message: "PDF uploaded successfully",
      data: newPdf,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const accessPdfByUser = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { email } = req.body; // frontend sends email after OTP verification
    const userIp =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await Users.findOne({ Email: email });
    if (!user || !user.isVerified) {
      return res.status(403).json({ message: "User email not verified" });
    }

    const pdf = await Pdf.findById(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    // Check expiry
    if (pdf.expiryTime && pdf.expiryTime < new Date()) {
      return res.status(403).json({ message: "PDF has expired" });
    }

    // Check if user already viewed PDF
    const viewed = pdf.viewers.some((v) => v.email === email);

    if (!viewed) {
      // If userLimit exceeded, deny access
      if (pdf.viewers.length >= pdf.userLimit) {
        return res.status(403).json({ message: "User limit exceeded" });
      }
      // Add user to viewers list
      pdf.viewers.push({ email, ip: userIp });
      await pdf.save();
    }

    // Return the file URL to frontend
    return res.status(200).json({ filePath: pdf.filePath });
  } catch (error) {
    console.error("Error accessing PDF:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addIpToPdf = async (req, res) => {
  const { id } = req.params;
  const { ip, deviceId } = req.body;

  if (!ip || !deviceId) {
    return res.status(400).json({ message: "Missing device ID or IP" });
  }

  try {
    const pdf = await Pdf.findById(id);
    if (!pdf) return res.status(404).json({ message: "PDF not found" });

    if (!pdf.accessList) pdf.accessList = [];

    const alreadyExists = pdf.accessList.find(
      (entry) => entry.deviceId === deviceId
    );

    if (!alreadyExists) {
      if (pdf.accessList.length >= pdf.userLimit) {
        return res.status(403).json({ message: "User limit exceeded" });
      }

      pdf.accessList.push({
        ip,
        deviceId,
        accessedAt: new Date(),
      });

      await pdf.save();
    }

    res.status(200).json({
      message: "Access granted",
      accessList: pdf.accessList,
    });
  } catch (err) {
    console.error("Error adding access:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSinglePdfData = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) return res.status(404).json({ message: "PDF not found" });

    res.status(200).json({ data: pdf });
  } catch (err) {
    console.error("Error fetching single PDF:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete PDF by ID Controller
// export const deletePdfById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedPdf = await Pdf.findByIdAndDelete(id);

//     if (!deletedPdf) {
//       return res.status(404).json({
//         message: "PDF not found",
//       });
//     }

//     res.status(200).json({
//       message: "PDF deleted successfully",
//       data: deletedPdf,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
export const deletePdfById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the doc first so we still have the path after deletion
    const pdfDoc = await Pdf.findById(id);
    if (!pdfDoc) {
      return res.status(404).json({ message: "PDF not found" });
    }

    // Capture stored path (e.g. "/uploads/123.pdf")
    const storedPath = pdfDoc.filePath; // may start with "/uploads/"
    let diskPath;

    if (storedPath) {
      // Remove leading slash so join works predictably
      // "/uploads/x.pdf" -> "uploads/x.pdf"
      const rel = storedPath.startsWith("/") ? storedPath.slice(1) : storedPath;

      // Guard against path traversal: normalize & ensure it stays under uploads
      const normalized = path.normalize(rel); // e.g., "uploads/x.pdf"
      const uploadsRoot = path.join(process.cwd(), "public", "uploads");
      diskPath = path.join(process.cwd(), "public", normalized);

      // Extra safety: confirm resolved path is inside uploadsRoot
      if (!diskPath.startsWith(uploadsRoot)) {
        console.warn("Refusing to delete outside uploads dir:", diskPath);
        diskPath = null;
      }
    }

    // Delete the DB record
    await Pdf.deleteOne({ _id: id });

    // Best-effort file delete
    if (diskPath) {
      try {
        await fs.unlink(diskPath);
        console.log("Deleted file:", diskPath);
      } catch (err) {
        if (err.code === "ENOENT") {
          console.warn("File not found on disk:", diskPath);
        } else {
          console.error("Error deleting file:", err);
        }
      }
    } else {
      console.warn("No valid disk path for PDF id:", id);
    }

    res.status(200).json({
      message: "PDF deleted successfully",
      data: pdfDoc, // returning the doc that was deleted
    });
  } catch (error) {
    console.error("deletePdfById error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// View All PDFs Controller
// export const PdfView = async (req, res) => {
//   try {
//     const userAgent = req.headers['user-agent'] || '';

//     // Detect browser access
//     const isBrowser = /Chrome|Safari|Firefox|Edg|Mozilla/i.test(userAgent);

//     if (isBrowser) {
//       return res.redirect(
//         "https://play.google.com/store/apps/details?id=com.harshu_07.boltexponativewind"
//       );
//     }

//     const pdfs = await Pdf.find();

//     res.status(200).json({
//       message: "PDFs fetched successfully",
//       data: pdfs,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// export const PdfView = async (req, res) => {
//   try {
//     const userAgent = req.headers['user-agent'] || '';
//     const accept = req.headers['accept'] || '';

//     const isBrowser =
//       /Chrome|Safari|Firefox|Edg|Mozilla/i.test(userAgent) &&
//       accept.includes('text/html');

//     if (isBrowser) {
//       return res.redirect(
//         "https://play.google.com/store/apps/details?id=com.harshu_07.boltexponativewind"
//       );
//     }

//     const pdfs = await Pdf.find();

//     res.status(200).json({
//       message: "PDFs fetched successfully",
//       data: pdfs,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// View All PDFs Controller
export const PdfView = async (req, res) => {
  try {
    const pdfs = await Pdf.find();
    //   .populate("uploadedBy", "name email")
    //   .sort({ createdAt: -1 });

    res.status(200).json({
      message: "PDFs fetched successfully",
      data: pdfs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};