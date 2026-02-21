import express from "express";
import {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─────────────────────────────────────────
// Single file upload
// ─────────────────────────────────────────
router.post("/single", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Determine folder from query param or default
    const folder = req.query.folder || "general";

    // Upload buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.json({
      message: "File uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// ─────────────────────────────────────────
// Multiple files (max 3 for banners)
// ─────────────────────────────────────────
router.post(
  "/multiple",
  protect,
  upload.array("files", 3),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const folder = req.query.folder || "banners";

      // Upload all files to Cloudinary in parallel
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, folder),
      );

      const results = await Promise.all(uploadPromises);

      const files = results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
      }));

      res.json({
        message: `${files.length} files uploaded`,
        files,
      });
    } catch (error) {
      res.status(500).json({ message: "Upload failed", error: error.message });
    }
  },
);

// ─────────────────────────────────────────
// Delete file from Cloudinary
// ─────────────────────────────────────────
router.delete("/delete", protect, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ message: "Public ID required" });
    }

    await deleteFromCloudinary(publicId);
    res.json({ message: "File deleted from Cloudinary" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

export default router;
