import User from "../models/user.model.js";

// @desc    Get all internal admins (excluding superAdmin)
// @route   GET /api/admins
// @access  superAdmin only
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      role: { $in: ["merchantAdmin", "dispatchAdmin"] },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new admin user
// @route   POST /api/admins
// @access  superAdmin only
export const createAdmin = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate inputs
    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create user (Your User model should already have a pre-save hook to hash the password)
    const newAdmin = await User.create({
      username,
      password,
      role,
      status: "active", // Assuming you have a status field
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        _id: newAdmin._id,
        username: newAdmin.username,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an admin user
// @route   DELETE /api/admins/:id
// @access  superAdmin only
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role === "superAdmin") {
      return res.status(403).json({ message: "Cannot delete a Super Admin" });
    }

    await admin.deleteOne();
    res.json({ message: "Admin account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
