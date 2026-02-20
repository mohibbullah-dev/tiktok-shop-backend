import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Merchant from "../models/merchant.model.js";
// import User from "../models/User.js";
// import Merchant from "../models/Merchant.js";

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // token valid for 30 days
  });
};

// Generate unique merchant ID (like 60065 in demo)
const generateMerchantId = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Generate unique invitation code for merchantAdmin
const generateInvitationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─────────────────────────────────────────
// @desc    Register a new merchant (store)
// @route   POST /api/auth/register
// @access  Public (but needs invitation code)
// ─────────────────────────────────────────
export const registerMerchant = async (req, res) => {
  const { username, email, password, mobile, storeName, invitationCode } =
    req.body;

  // Check invitation code is valid
  const referrer = await User.findOne({
    invitationCode,
    role: "merchantAdmin",
  });

  if (!referrer) {
    return res.status(400).json({ message: "Invalid invitation code" });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "Email already registered" });
  }

  // Generate unique merchant ID
  let merchantIdNum = generateMerchantId();
  // Make sure it's unique
  let existing = await Merchant.findOne({ merchantId: merchantIdNum });
  while (existing) {
    merchantIdNum = generateMerchantId();
    existing = await Merchant.findOne({ merchantId: merchantIdNum });
  }

  // Create user account
  const user = await User.create({
    username,
    email,
    password,
    mobile,
    role: "merchant",
    referredBy: referrer._id,
  });

  // Create merchant profile
  const merchant = await Merchant.create({
    user: user._id,
    merchantId: merchantIdNum,
    storeName,
    referrer: referrer._id,
  });

  // Link merchant profile to user
  user.merchantId = merchant._id;
  await user.save();

  res.status(201).json({
    message: "Store registered successfully, awaiting approval",
    token: generateToken(user._id),
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      merchantId: merchant.merchantId,
    },
  });
};

// ─────────────────────────────────────────
// @desc    Login for ALL roles
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check if account is frozen
  if (user.isFrozen) {
    return res.status(403).json({ message: "Your account has been frozen" });
  }

  // Update last login time
  user.lastLogin = new Date();
  await user.save();

  // Build response based on role
  let extraData = {};

  if (user.role === "merchant") {
    const merchant = await Merchant.findOne({ user: user._id });

    // Check merchant status
    if (merchant && merchant.status === "frozen") {
      return res.status(403).json({ message: "Your store has been frozen" });
    }

    // Mark merchant as online
    if (merchant) {
      merchant.isOnline = true;
      await merchant.save();
    }

    extraData = {
      merchantId: merchant?.merchantId,
      storeName: merchant?.storeName,
      storeLogo: merchant?.storeLogo,
      balance: merchant?.balance,
      vipLevel: merchant?.vipLevel,
      status: merchant?.status,
    };
  }

  if (user.role === "merchantAdmin") {
    extraData = {
      invitationCode: user.invitationCode,
    };
  }

  res.json({
    token: generateToken(user._id),
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      ...extraData,
    },
  });
};

// ─────────────────────────────────────────
// @desc    Get logged in user profile
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────
export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  let merchantData = null;
  if (user.role === "merchant") {
    merchantData = await Merchant.findOne({ user: user._id });
  }

  res.json({
    user,
    merchant: merchantData,
  });
};

// ─────────────────────────────────────────
// @desc    Create admin users (superAdmin use only)
// @route   POST /api/auth/create-admin
// @access  Private - superAdmin only
// ─────────────────────────────────────────
export const createAdmin = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Only allow creating admin roles
  const allowedRoles = ["merchantAdmin", "dispatchAdmin"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role for this endpoint" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "Email already registered" });
  }

  // merchantAdmin gets invitation code
  let invitationCode = undefined;
  if (role === "merchantAdmin") {
    invitationCode = generateInvitationCode();
    // Make sure it's unique
    let existingCode = await User.findOne({ invitationCode });
    while (existingCode) {
      invitationCode = generateInvitationCode();
      existingCode = await User.findOne({ invitationCode });
    }
  }

  const user = await User.create({
    username,
    email,
    password,
    role,
    invitationCode,
  });

  res.status(201).json({
    message: `${role} created successfully`,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      invitationCode: user.invitationCode,
    },
  });
};
