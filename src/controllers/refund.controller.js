import Refund from "../models/refund.model.js";
import Order from "../models/order.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";

// @desc    Merchant creates a refund request
// @route   POST /api/refunds
// @access  Merchant only
export const createRefundRequest = async (req, res) => {
  try {
    const { orderSn, reasonType, explanation } = req.body;

    // 1. Find the merchant
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant)
      return res.status(404).json({ message: "Merchant not found" });

    // 2. Find the order and verify it belongs to this merchant
    const order = await Order.findOne({ orderSn, merchant: merchant._id });
    if (!order)
      return res.status(404).json({ message: "Order not found or not yours" });

    // 3. Ensure order is eligible for refund (must be picked up/paid for, but not completed)
    if (order.status === "pendingPayment") {
      return res.status(400).json({
        message: "You have not paid for this order yet, no refund needed.",
      });
    }
    if (order.status === "completed" || order.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot refund a completed or cancelled order." });
    }

    // 4. Check if a refund request already exists for this order
    const existingRefund = await Refund.findOne({ order: order._id });
    if (existingRefund) {
      return res
        .status(400)
        .json({ message: "A refund request already exists for this order." });
    }

    // 5. Generate a unique Refund Serial Number
    const refundSn = "REF" + Date.now() + Math.floor(Math.random() * 1000);

    // 6. Create the refund ticket
    const refund = await Refund.create({
      merchant: merchant._id,
      order: order._id,
      refundSn,
      buyerNickname: order.buyerName,
      reasonType: reasonType || "Other",
      amount: order.totalCost, // Refund the exact amount the merchant paid
      explanation: explanation || "",
      status: "pending",
    });

    // 7. Update order status to indicate it is locked in a refund process
    order.status = "refunding";
    await order.save();

    res
      .status(201)
      .json({ message: "Refund request submitted successfully", refund });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all refunds (Admin)
// @route   GET /api/refunds
export const getAllRefunds = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await Refund.countDocuments(filter);
    const refunds = await Refund.find(filter)
      .populate("merchant", "storeName merchantId")
      .populate("order", "orderSn status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      refunds,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a refund (Approve/Reject)
// @route   PUT /api/refunds/:id/process
export const processRefund = async (req, res) => {
  try {
    const { action, adminRemark } = req.body; // action: "approve" or "reject"
    const refund = await Refund.findById(req.params.id);

    if (!refund) return res.status(404).json({ message: "Refund not found" });
    if (refund.status !== "pending")
      return res.status(400).json({ message: "Refund already processed" });

    const order = await Order.findById(refund.order);
    const merchant = await Merchant.findById(refund.merchant);

    if (action === "approve") {
      refund.status = "approved";

      // 1. Give money back to merchant
      merchant.balance += refund.amount;
      // 2. Remove the expected selling price from pending amount
      merchant.pendingAmount = Math.max(
        0,
        merchant.pendingAmount - order.sellingPrice,
      );
      await merchant.save();

      // 3. Record Transaction
      await Transaction.create({
        merchant: merchant._id,
        linkedId: refund.refundSn,
        amount: refund.amount,
        balanceAfter: merchant.balance,
        type: "refund",
      });

      // 4. Update Order Status
      order.status = "cancelled";
      order.isRefunded = true;
      await order.save();
    } else if (action === "reject") {
      refund.status = "rejected";
    }

    refund.adminRemark = adminRemark || "";
    refund.processedBy = req.user._id;
    await refund.save();

    res.json({ message: `Refund ${action}d successfully`, refund });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
