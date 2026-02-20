import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

// ─────────────────────────────────────────
// @desc    Get all merchants
// @route   GET /api/merchants
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllMerchants = async (req, res) => {
  const {
    merchantId,
    storeName,
    status,
    withdrawalStatus,
    page = 1,
    limit = 10,
  } = req.query;

  // Build filter object
  const filter = {};

  if (merchantId) filter.merchantId = merchantId;
  if (storeName) filter.storeName = { $regex: storeName, $options: "i" };
  if (status) filter.status = status;
  if (withdrawalStatus) {
    filter.isWithdrawalForbidden = withdrawalStatus === "forbidden";
  }

  // If merchantAdmin, only show their referred merchants
  if (req.user.role === "merchantAdmin") {
    filter.referrer = req.user._id;
  }

  const total = await Merchant.countDocuments(filter);

  const merchants = await Merchant.find(filter)
    .populate("user", "email mobile lastLogin")
    .populate("referrer", "username invitationCode")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    merchants,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get single merchant
// @route   GET /api/merchants/:id
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getMerchantById = async (req, res) => {
  const merchant = await Merchant.findById(req.params.id)
    .populate("user", "-password")
    .populate("referrer", "username invitationCode");

  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  res.json(merchant);
};

// ─────────────────────────────────────────
// @desc    Update merchant status (approve/reject/freeze)
// @route   PUT /api/merchants/:id/status
// @access  superAdmin only
// ─────────────────────────────────────────
export const updateMerchantStatus = async (req, res) => {
  const { status } = req.body;

  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  merchant.status = status;
  await merchant.save();

  // Also freeze/unfreeze the user account
  const user = await User.findById(merchant.user);
  if (user) {
    user.isFrozen = status === "frozen";
    await user.save();
  }

  res.json({ message: `Merchant status updated to ${status}`, merchant });
};

// ─────────────────────────────────────────
// @desc    Toggle withdrawal forbidden
// @route   PUT /api/merchants/:id/withdrawal-status
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const toggleWithdrawal = async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  merchant.isWithdrawalForbidden = !merchant.isWithdrawalForbidden;
  await merchant.save();

  res.json({
    message: `Withdrawal ${merchant.isWithdrawalForbidden ? "forbidden" : "allowed"}`,
    isWithdrawalForbidden: merchant.isWithdrawalForbidden,
  });
};

// ─────────────────────────────────────────
// @desc    Add funds to merchant wallet
// @route   POST /api/merchants/:id/add-funds
// @access  superAdmin only
// ─────────────────────────────────────────
export const addFunds = async (req, res) => {
  const { amount, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const merchant = await Merchant.findById(req?.params?.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Add to balance
  merchant.balance += Number(amount);
  merchant.totalIncome += Number(amount);
  await merchant.save();

  // Record transaction
  await Transaction.create({
    merchant: merchant._id,
    linkedId: note || "Admin add funds",
    amount: Number(amount),
    balanceAfter: merchant.balance,
    type: "adminAdd",
  });

  res.json({
    message: `$${amount} added to merchant wallet`,
    newBalance: merchant.balance,
  });
};

// ─────────────────────────────────────────
// @desc    Deduct funds from merchant wallet
// @route   POST /api/merchants/:id/deduct-funds
// @access  superAdmin only
// ─────────────────────────────────────────
export const deductFunds = async (req, res) => {
  const { amount, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  if (merchant.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  merchant.balance -= Number(amount);
  await merchant.save();

  await Transaction.create({
    merchant: merchant._id,
    linkedId: note || "Admin deduct funds",
    amount: -Number(amount),
    balanceAfter: merchant.balance,
    type: "adminDeduct",
  });

  res.json({
    message: `$${amount} deducted from merchant wallet`,
    newBalance: merchant.balance,
  });
};

// ─────────────────────────────────────────
// @desc    Get merchant's own profile (for merchant frontend)
// @route   GET /api/merchants/my-store
// @access  merchant only
// ─────────────────────────────────────────
export const getMyStore = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id }).populate(
    "user",
    "-password -paymentPassword",
  );

  if (!merchant) {
    return res.status(404).json({ message: "Store not found" });
  }

  res.json(merchant);
};

// ─────────────────────────────────────────
// @desc    Update merchant's own store info
// @route   PUT /api/merchants/my-store
// @access  merchant only
// ─────────────────────────────────────────
export const updateMyStore = async (req, res) => {
  const {
    storeName,
    storePhone,
    storeAddress,
    storeIntroduction,
    welcomeMessage,
  } = req.body;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Store not found" });
  }

  // Update fields if provided
  if (storeName) merchant.storeName = storeName;
  if (storePhone) merchant.storePhone = storePhone;
  if (storeAddress) merchant.storeAddress = storeAddress;
  if (storeIntroduction) merchant.storeIntroduction = storeIntroduction;
  if (welcomeMessage) merchant.welcomeMessage = welcomeMessage;

  await merchant.save();

  res.json({ message: "Store updated successfully", merchant });
};

// ─────────────────────────────────────────
// @desc    Update store banners
// @route   PUT /api/merchants/my-store/banners
// @access  merchant only
// ─────────────────────────────────────────
export const updateBanners = async (req, res) => {
  const { banners } = req.body;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Store not found" });
  }

  merchant.banners = banners;
  await merchant.save();

  res.json({ message: "Banners updated", banners: merchant.banners });
};

// ─────────────────────────────────────────
// @desc    Get dashboard stats (for admin)
// @route   GET /api/merchants/dashboard-stats
// @access  superAdmin
// ─────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // Total registrations
  const totalRegistrations = await User.countDocuments({ role: "merchant" });
  const todayRegistrations = await User.countDocuments({
    role: "merchant",
    createdAt: { $gte: today },
  });
  const yesterdayRegistrations = await User.countDocuments({
    role: "merchant",
    createdAt: { $gte: yesterday, $lt: today },
  });

  // Total store registrations
  const totalStores = await Merchant.countDocuments();
  const todayStores = await Merchant.countDocuments({
    createdAt: { $gte: today },
  });

  // Recharge stats from transactions
  const totalRecharge = await Transaction.aggregate([
    { $match: { type: "recharge" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const todayRecharge = await Transaction.aggregate([
    { $match: { type: "recharge", createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const thisMonthRecharge = await Transaction.aggregate([
    { $match: { type: "recharge", createdAt: { $gte: thisMonthStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  // Withdrawal stats
  const totalWithdrawals = await Transaction.aggregate([
    { $match: { type: "withdrawal" } },
    { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
  ]);

  // Profit stats
  const totalProfit = await Transaction.aggregate([
    { $match: { type: "orderCompleted" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  res.json({
    registrations: {
      total: totalRegistrations,
      today: todayRegistrations,
      yesterday: yesterdayRegistrations,
    },
    stores: {
      total: totalStores,
      today: todayStores,
    },
    recharge: {
      total: totalRecharge[0]?.total || 0,
      today: todayRecharge[0]?.total || 0,
      thisMonth: thisMonthRecharge[0]?.total || 0,
    },
    withdrawals: {
      total: totalWithdrawals[0]?.total || 0,
    },
    profit: {
      total: totalProfit[0]?.total || 0,
    },
  });
};
