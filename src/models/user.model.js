import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    nickname: {
      type: String,
      default: "",
    },
    mobile: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["superAdmin", "merchantAdmin", "dispatchAdmin", "merchant"],
      required: true,
    },

    // Only for merchantAdmin role
    invitationCode: {
      type: String,
      unique: true,
      sparse: true, // allows multiple nulls
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Only for merchant role
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },

    // Customer service link
    customerServiceLink: {
      type: String,
      default: "",
    },

    // Language preference
    language: {
      type: String,
      default: "English",
    },

    // Payment password (separate from login password)
    paymentPassword: {
      type: String,
      default: "",
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  },
);

// Encrypt password before saving
userSchema.pre("save", async function () {
  // Only hash if password was changed
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords on login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
