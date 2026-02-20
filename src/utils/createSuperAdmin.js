import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import connectDB from "../config/db.js";

dotenv.config();
connectDB();

const createSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const exists = await User.findOne({ role: "superAdmin" });
    if (exists) {
      console.log("Super admin already exists!");
      process.exit();
    }

    // Create super admin
    const superAdmin = await User.create({
      username: "superadmin",
      email: "superadmin@tiktokshop.com",
      password: "Admin@123456",
      nickname: "Super Admin",
      role: "superAdmin",
    });

    console.log("Super Admin created!");
    console.log("Email: superadmin@tiktokshop.com");
    console.log("Password: Admin@123456");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createSuperAdmin();
