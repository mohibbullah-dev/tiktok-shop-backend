import Complaint from "../models/complaint.model.js";
import Merchant from "../models/merchant.model.js";
import Order from "../models/order.model.js";

// ─────────────────────────────────────────
// @desc    Merchant submits complaint
// @route   POST /api/complaints
// @access  merchant only
// ─────────────────────────────────────────
export const submitComplaint = async (req, res) => {
  const { orderSn, content, images } = req.body;

  if (!orderSn || !content) {
    return res.status(400).json({
      message: "Order number and content are required",
    });
  }

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Find the order by SN
  const order = await Order.findOne({
    orderSn,
    merchant: merchant._id,
  });

  if (!order) {
    return res.status(404).json({
      message: "Order not found or does not belong to your store",
    });
  }

  // Check no existing complaint for this order
  const existing = await Complaint.findOne({
    merchant: merchant._id,
    orderSn,
  });

  if (existing) {
    return res.status(400).json({
      message: "Complaint already submitted for this order",
    });
  }

  const complaint = await Complaint.create({
    merchant: merchant._id,
    orderSn,
    order: order._id,
    content,
    images: images || [],
  });

  res.status(201).json({
    message: "Complaint submitted successfully",
    complaint,
  });
};

// ─────────────────────────────────────────
// @desc    Get my complaints (merchant)
// @route   GET /api/complaints/my-complaints
// @access  merchant only
// ─────────────────────────────────────────
export const getMyComplaints = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const complaints = await Complaint.find({ merchant: merchant._id })
    .populate("order", "orderSn totalCost earnings status")
    .sort({ createdAt: -1 });

  res.json(complaints);
};

// ─────────────────────────────────────────
// @desc    Get all complaints (admin)
// @route   GET /api/complaints
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllComplaints = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Complaint.countDocuments(filter);

  const complaints = await Complaint.find(filter)
    .populate("merchant", "storeName merchantId")
    .populate("order", "orderSn status")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    complaints,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Resolve complaint (admin)
// @route   PUT /api/complaints/:id/resolve
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const resolveComplaint = async (req, res) => {
  const { resolution, status } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found" });
  }

  complaint.status = status || "resolved";
  complaint.resolution = resolution || "";
  complaint.resolvedBy = req.user._id;
  complaint.resolvedAt = new Date();
  await complaint.save();

  res.json({ message: "Complaint updated", complaint });
};
