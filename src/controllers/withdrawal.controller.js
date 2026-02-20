import Withdrawal from "../models/withdrawal.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";

// Generate unique withdrawal SN
const generateExtractSn = () => {
  return "WTH" + Date.now() + Math.floor(Math.random() * 1000);
};

// ─────────────────────────────────────────
// @desc    Submit withdrawal request (merchant)
// @route   POST /api/withdrawal
// @access  merchant only
// ─────────────────────────────────────────
export const submitWithdrawal = async (req, res) => {
  const {
    extractPrice,
    extractType,
    accountName,
    bankCardNumber,
    bankName,
    network,
    walletAddress,
    paymentPassword,
  } = req.body;

  if (!extractPrice || extractPrice <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Check withdrawal is not forbidden
  if (merchant.isWithdrawalForbidden) {
    return res
      .status(403)
      .json({ message: "Withdrawal is forbidden for your account" });
  }

  // Check sufficient balance
  if (merchant.balance < extractPrice) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  // Verify payment password
  const user = await (
    await import("../models/user.model.js")
  ).default.findById(req.user._id);
  const bcrypt = await import("bcryptjs");
  const isPasswordMatch = await bcrypt.default.compare(
    paymentPassword,
    user.paymentPassword,
  );
  if (!isPasswordMatch) {
    return res.status(401).json({ message: "Incorrect payment password" });
  }

  // Deduct balance immediately (goes to pending)
  merchant.balance -= Number(extractPrice);
  await merchant.save();

  // Create withdrawal record
  const withdrawal = await Withdrawal.create({
    extractSn: generateExtractSn(),
    merchant: merchant._id,
    extractPrice: Number(extractPrice),
    extractType,
    accountName: accountName || "",
    bankCardNumber: bankCardNumber || "",
    bankName: bankName || "",
    network: network || "",
    walletAddress: walletAddress || "",
    status: "underReview",
  });

  // Record transaction (debit)
  await Transaction.create({
    merchant: merchant._id,
    linkedId: withdrawal.extractSn,
    amount: -Number(extractPrice),
    balanceAfter: merchant.balance,
    type: "withdrawal",
  });

  res.status(201).json({
    message: "Withdrawal request submitted",
    withdrawal,
    newBalance: merchant.balance,
  });
};

// ─────────────────────────────────────────
// @desc    Get all withdrawal requests (admin)
// @route   GET /api/withdrawal
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllWithdrawals = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // merchantAdmin only sees their referred merchants
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Withdrawal.countDocuments(filter);

  const withdrawals = await Withdrawal.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    withdrawals,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get my withdrawal records (merchant)
// @route   GET /api/withdrawal/my-records
// @access  merchant only
// ─────────────────────────────────────────
export const getMyWithdrawals = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const withdrawals = await Withdrawal.find({ merchant: merchant._id }).sort({
    createdAt: -1,
  });

  res.json(withdrawals);
};

// ─────────────────────────────────────────
// @desc    Review withdrawal - approve (superAdmin only)
// @route   PUT /api/withdrawal/:id/approve
// @access  superAdmin only
// ─────────────────────────────────────────
export const approveWithdrawal = async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) {
    return res.status(404).json({ message: "Withdrawal not found" });
  }

  if (withdrawal.status !== "underReview") {
    return res.status(400).json({ message: "Withdrawal already processed" });
  }

  withdrawal.status = "withdrawn";
  withdrawal.reviewedBy = req.user._id;
  await withdrawal.save();

  res.json({ message: "Withdrawal approved", withdrawal });
};

// ─────────────────────────────────────────
// @desc    Cancel withdrawal - merchantAdmin can cancel
// @route   PUT /api/withdrawal/:id/cancel
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const cancelWithdrawal = async (req, res) => {
  const { reason } = req.body;

  const withdrawal = await Withdrawal.findById(req.params.id).populate(
    "merchant",
  );

  if (!withdrawal) {
    return res.status(404).json({ message: "Withdrawal not found" });
  }

  if (withdrawal.status !== "underReview") {
    return res.status(400).json({ message: "Withdrawal already processed" });
  }

  // merchantAdmin can only cancel withdrawals of their referred merchants
  if (req.user.role === "merchantAdmin") {
    const merchant = withdrawal.merchant;
    if (merchant.referrer.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this withdrawal" });
    }
  }

  // Return balance to merchant
  const merchant = await Merchant.findById(withdrawal.merchant._id);
  merchant.balance += withdrawal.extractPrice;
  await merchant.save();

  // Record reversal transaction
  await Transaction.create({
    merchant: merchant._id,
    linkedId: withdrawal.extractSn,
    amount: withdrawal.extractPrice,
    balanceAfter: merchant.balance,
    type: "adminAdd",
  });

  withdrawal.status = "rejected";
  withdrawal.rejectionReason = reason || "Cancelled by admin";
  withdrawal.reviewedBy = req.user._id;
  await withdrawal.save();

  res.json({
    message: "Withdrawal cancelled, balance returned to merchant",
    withdrawal,
    newBalance: merchant.balance,
  });
};
