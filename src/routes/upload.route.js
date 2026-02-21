import express from "express";
import upload from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Single file upload
router.post("/single", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Return the file URL
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({
    message: "File uploaded successfully",
    url: fileUrl,
    filename: req.file.filename,
  });
});

// Multiple files upload (max 3 for banners)
router.post("/multiple", protect, upload.array("files", 3), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const urls = req.files.map(
    (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
  );

  res.json({
    message: `${req.files.length} files uploaded`,
    urls,
  });
});

export default router;
