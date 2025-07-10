import { Pdf } from "../Models/Pdf.model.js";
import { Users } from "../Models/Users.model.js";

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

// controllers/pdfController.js
// export const addIpToPdf = async (req, res) => {
//   const { id } = req.params;
//   const { ip, deviceId } = req.body;

//   try {
//     const pdf = await Pdf.findById(id);
//     if (!pdf) return res.status(404).json({ message: "PDF not found" });

//     if (!pdf.accessList) {
//       pdf.accessList = [];
//     }

//     // Check if this deviceId is already in accessList
//     const alreadyExists = pdf.accessList.some(
//       (entry) => entry.deviceId === deviceId
//     );

//     if (alreadyExists) {
//       return res.status(200).json({ message: "Already accessed" });
//     }

//     // Enforce userLimit
//     if (pdf.accessList.length >= pdf.userLimit) {
//       return res.status(403).json({ message: "User limit exceeded" });
//     }

//     // Save access with timestamp
//     pdf.accessList.push({
//       ip,
//       deviceId,
//       accessedAt: new Date(),
//     });

//     await pdf.save();

//     res.status(200).json({
//       message: "Access granted",
//       accessList: pdf.accessList,
//     });
//   } catch (err) {
//     console.error("Error adding access:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
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
export const deletePdfById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPdf = await Pdf.findByIdAndDelete(id);

    if (!deletedPdf) {
      return res.status(404).json({
        message: "PDF not found",
      });
    }

    res.status(200).json({
      message: "PDF deleted successfully",
      data: deletedPdf,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// View All PDFs Controller
export const PdfView = async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';

    // Detect browser access
    const isBrowser = /Chrome|Safari|Firefox|Edg|Mozilla/i.test(userAgent);

    if (isBrowser) {
      return res.redirect(
        "https://play.google.com/store/apps/details?id=com.harshu_07.boltexponativewind"
      );
    }

    const pdfs = await Pdf.find();

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
