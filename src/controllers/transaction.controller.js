import Transaction from "../models/transaction.model.js";
import Merchant from "../models/merchant.model.js";

// ─────────────────────────────────────────
// @desc    Get merchant's own fund records
// @route   GET /api/transactions/my-records
// @access  merchant only
// ─────────────────────────────────────────
export const getMyTransactions = async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const filter = { merchant: merchant._id };
  if (type && type !== "all") filter.type = type;

  const total = await Transaction.countDocuments(filter);

  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    transactions,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get all transactions (admin)
// @route   GET /api/transactions
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllTransactions = async (req, res) => {
  const { merchantId, type, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (type) filter.type = type;

  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Transaction.countDocuments(filter);

  const transactions = await Transaction.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    transactions,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get financial statements (daily summary)
// @route   GET /api/transactions/financial-statements
// @access  merchant only
// ─────────────────────────────────────────
export const getFinancialStatements = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Group transactions by date
  const statements = await Transaction.aggregate([
    { $match: { merchant: merchant._id } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        totalOrders: {
          $sum: {
            $cond: [{ $eq: ["$type", "orderCompleted"] }, 1, 0],
          },
        },
        totalProfit: {
          $sum: {
            $cond: [{ $eq: ["$type", "orderCompleted"] }, "$amount", 0],
          },
        },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 30 },
  ]);

  res.json({
    awaitingAmount: merchant.pendingAmount,
    totalProfit: merchant.totalProfit,
    statements,
  });
};

// ─────────────────────────────────────────
// @desc    Delete transaction (admin)
// @route   DELETE /api/transactions/:id
// @access  superAdmin only
// ─────────────────────────────────────────
export const deleteTransaction = async (req, res) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }
  res.json({ message: "Transaction deleted" });
};
