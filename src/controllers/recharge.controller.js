import Recharge from "../models/recharge.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";

// Generate unique recharge ID
const generateRechargeId = () => {
  return "RCH" + Date.now() + Math.floor(Math.random() * 1000);
};

// ─────────────────────────────────────────
// @desc    Submit recharge request (merchant)
// @route   POST /api/recharge
// @access  merchant only
// ─────────────────────────────────────────
export const submitRecharge = async (req, res) => {
  const { price, rechargeType, currencyType, voucher } = req.body;

  if (!price || price <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const recharge = await Recharge.create({
    rechargeId: generateRechargeId(),
    merchant: merchant._id,
    orderId: "ORD" + Date.now(),
    price: Number(price),
    rechargeType: rechargeType || "USDT",
    currencyType: currencyType || "USD",
    voucher: voucher || "",
    status: 0, // pending review
  });

  res.status(201).json({
    message: "Recharge request submitted, awaiting review",
    recharge,
  });
};

// ─────────────────────────────────────────
// @desc    Get all recharge requests (admin)
// @route   GET /api/recharge
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllRecharges = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status !== undefined) filter.status = Number(status);

  // merchantAdmin only sees their referred merchants
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Recharge.countDocuments(filter);

  const recharges = await Recharge.find(filter)
    .populate({
      path: "merchant",
      select: "storeName merchantId",
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    recharges,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get my recharge records (merchant)
// @route   GET /api/recharge/my-records
// @access  merchant only
// ─────────────────────────────────────────
export const getMyRecharges = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const recharges = await Recharge.find({ merchant: merchant._id }).sort({
    createdAt: -1,
  });

  res.json(recharges);
};

// ─────────────────────────────────────────
// @desc    Review recharge (approve/reject)
// @route   PUT /api/recharge/:id/review
// @access  superAdmin only
// ─────────────────────────────────────────
export const reviewRecharge = async (req, res) => {
  const { status } = req.body;
  // status: 1 = approved, 2 = rejected

  const recharge = await Recharge.findById(req.params.id);
  if (!recharge) {
    return res.status(404).json({ message: "Recharge not found" });
  }

  if (recharge.status !== 0) {
    return res.status(400).json({ message: "Recharge already reviewed" });
  }

  recharge.status = status;
  recharge.reviewedBy = req.user._id;
  await recharge.save();

  // If approved, add balance to merchant
  if (status === 1) {
    const merchant = await Merchant.findById(recharge.merchant);
    if (merchant) {
      merchant.balance += recharge.price;
      merchant.totalIncome += recharge.price;
      await merchant.save();

      // Record transaction
      await Transaction.create({
        merchant: merchant._id,
        linkedId: recharge.rechargeId,
        amount: recharge.price,
        balanceAfter: merchant.balance,
        type: "recharge",
      });
    }
  }

  res.json({
    message: status === 1 ? "Recharge approved" : "Recharge rejected",
    recharge,
  });
};
