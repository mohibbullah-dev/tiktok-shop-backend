import VipLevel from "../models/viplevel.model.js";
import VipApplication from "../models/vipApplication.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────
// @desc    Get all VIP levels
// @route   GET /api/vip/levels
// @access  Public
// ─────────────────────────────────────────
export const getVipLevels = async (req, res) => {
  const levels = await VipLevel.find({ status: 1 }).sort({ level: 1 });
  res.json(levels);
};

// ─────────────────────────────────────────
// @desc    Create/Update VIP level (admin)
// @route   POST /api/vip/levels
// @access  superAdmin only
// ─────────────────────────────────────────
export const createVipLevel = async (req, res) => {
  const { levelId, name, nameEn, level, price, rate, requiredVisits, icon } =
    req.body;

  // Check if level already exists
  const existing = await VipLevel.findOne({ level });
  if (existing) {
    return res.status(400).json({ message: "VIP level already exists" });
  }

  const vipLevel = await VipLevel.create({
    levelId,
    name,
    nameEn,
    level,
    price,
    rate,
    requiredVisits: requiredVisits || 0,
    icon: icon || "",
  });

  res.status(201).json({ message: "VIP level created", vipLevel });
};

// ─────────────────────────────────────────
// @desc    Update VIP level
// @route   PUT /api/vip/levels/:id
// @access  superAdmin only
// ─────────────────────────────────────────
export const updateVipLevel = async (req, res) => {
  const vipLevel = await VipLevel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!vipLevel) {
    return res.status(404).json({ message: "VIP level not found" });
  }

  res.json({ message: "VIP level updated", vipLevel });
};

// ─────────────────────────────────────────
// @desc    Toggle VIP level status
// @route   PUT /api/vip/levels/:id/toggle
// @access  superAdmin only
// ─────────────────────────────────────────
export const toggleVipLevel = async (req, res) => {
  const vipLevel = await VipLevel.findById(req.params.id);
  if (!vipLevel) {
    return res.status(404).json({ message: "VIP level not found" });
  }

  vipLevel.status = vipLevel.status === 1 ? 0 : 1;
  await vipLevel.save();

  res.json({ message: `VIP level status set to ${vipLevel.status}`, vipLevel });
};

// ─────────────────────────────────────────
// @desc    Merchant submits VIP upgrade request
// @route   POST /api/vip/apply
// @access  merchant only
// ─────────────────────────────────────────
export const applyVipUpgrade = async (req, res) => {
  const { requestedLevel, paymentPassword } = req.body;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Verify payment password
  const user = await User.findById(req.user._id);
  if (!user.paymentPassword) {
    return res
      .status(400)
      .json({ message: "Please set payment password first" });
  }

  const isMatch = await bcrypt.compare(paymentPassword, user.paymentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: "Incorrect payment password" });
  }

  // Get VIP level details
  const vipLevel = await VipLevel.findOne({ level: requestedLevel });
  if (!vipLevel) {
    return res.status(404).json({ message: "VIP level not found" });
  }

  // Cannot apply for lower or same level
  if (requestedLevel <= merchant.vipLevel) {
    return res.status(400).json({
      message: "Cannot apply for same or lower VIP level",
    });
  }

  // Check sufficient balance
  if (merchant.balance < vipLevel.price) {
    return res
      .status(400)
      .json({ message: "Insufficient balance for VIP upgrade" });
  }

  // Check for existing pending application
  const existingApp = await VipApplication.findOne({
    merchant: merchant._id,
    status: "pendingReview",
  });
  if (existingApp) {
    return res.status(400).json({
      message: "You already have a pending VIP application",
    });
  }

  // Create application
  const application = await VipApplication.create({
    merchant: merchant._id,
    requestedLevel,
    price: vipLevel.price,
    status: "pendingReview",
  });

  res.status(201).json({
    message: "VIP upgrade request submitted, awaiting review",
    application,
  });
};

// ─────────────────────────────────────────
// @desc    Get all VIP applications (admin)
// @route   GET /api/vip/applications
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getVipApplications = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // merchantAdmin only sees their merchants
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await VipApplication.countDocuments(filter);

  const applications = await VipApplication.find(filter)
    .populate("merchant", "storeName merchantId vipLevel")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    applications,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Review VIP application
// @route   PUT /api/vip/applications/:id/review
// @access  superAdmin only
// ─────────────────────────────────────────
export const reviewVipApplication = async (req, res) => {
  const { status } = req.body;
  // status: 'approved' or 'rejected'

  const application = await VipApplication.findById(req.params.id).populate(
    "merchant",
  );

  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (application.status !== "pendingReview") {
    return res.status(400).json({ message: "Application already reviewed" });
  }

  const merchant = await Merchant.findById(application.merchant._id);

  if (status === "approved") {
    // Check balance again at time of approval
    if (merchant.balance < application.price) {
      return res.status(400).json({
        message: "Merchant has insufficient balance for this upgrade",
      });
    }

    // Deduct VIP price from merchant balance
    merchant.balance -= application.price;
    merchant.vipLevel = application.requestedLevel;
    await merchant.save();

    // Record transaction
    await Transaction.create({
      merchant: merchant._id,
      linkedId: application._id.toString(),
      amount: -application.price,
      balanceAfter: merchant.balance,
      type: "vipUpgrade",
    });
  }

  application.status = status;
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  await application.save();

  res.json({
    message: `VIP application ${status}`,
    application,
    newBalance: status === "approved" ? merchant.balance : undefined,
  });
};

// ─────────────────────────────────────────
// @desc    Seed default VIP levels
// @route   POST /api/vip/seed
// @access  superAdmin only
// ─────────────────────────────────────────
export const seedVipLevels = async (req, res) => {
  console.log("hello: i am in the seed controller fn");
  const defaultLevels = [
    {
      levelId: 0,
      name: "VIP0",
      nameEn: "Basic",
      level: 0,
      price: 0,
      rate: 0.15,
      requiredVisits: 0,
    },
    {
      levelId: 1,
      name: "VIP1",
      nameEn: "Bronze",
      level: 1,
      price: 1000,
      rate: 0.2,
      requiredVisits: 1000,
    },
    {
      levelId: 2,
      name: "VIP2",
      nameEn: "Silver",
      level: 2,
      price: 2000,
      rate: 0.25,
      requiredVisits: 10000,
    },
    {
      levelId: 3,
      name: "VIP3",
      nameEn: "Gold",
      level: 3,
      price: 4000,
      rate: 0.27,
      requiredVisits: 50000,
    },
    {
      levelId: 4,
      name: "VIP4",
      nameEn: "Platinum",
      level: 4,
      price: 8000,
      rate: 0.33,
      requiredVisits: 100000,
    },
    {
      levelId: 5,
      name: "VIP5",
      nameEn: "Diamond",
      level: 5,
      price: 16000,
      rate: 0.38,
      requiredVisits: 200000,
    },
    {
      levelId: 6,
      name: "VIP6",
      nameEn: "Crown",
      level: 6,
      price: 32000,
      rate: 0.43,
      requiredVisits: 500000,
    },
  ];

  await VipLevel.deleteMany({});
  await VipLevel.insertMany(defaultLevels);

  res.json({ message: "7 VIP levels seeded successfully" });
};
