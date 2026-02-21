import Notice from "../models/notice.model.js";
import Merchant from "../models/merchant.model.js";

// ─────────────────────────────────────────
// @desc    Send notice to merchant (admin)
// @route   POST /api/notices
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const sendNotice = async (req, res) => {
  const { merchantId, type, title, content, userManagement } = req.body;

  // Find merchant by DB id or merchantId string
  let merchant;
  if (merchantId.length === 24) {
    merchant = await Merchant.findById(merchantId);
  } else {
    merchant = await Merchant.findOne({ merchantId });
  }

  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const notice = await Notice.create({
    merchant: merchant._id,
    type: type || "Type 1",
    title,
    content,
    userManagement: userManagement || "System",
  });

  res.status(201).json({ message: "Notice sent", notice });
};

// ─────────────────────────────────────────
// @desc    Get all notices (admin)
// @route   GET /api/notices
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllNotices = async (req, res) => {
  const { merchantId, page = 1, limit = 10 } = req.query;

  const filter = {};

  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  // merchantAdmin only sees their merchants
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Notice.countDocuments(filter);

  const notices = await Notice.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    notices,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get my notices (merchant)
// @route   GET /api/notices/my-notices
// @access  merchant only
// ─────────────────────────────────────────
export const getMyNotices = async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const filter = { merchant: merchant._id };
  if (type === "unread") filter.isSeen = false;
  if (type === "read") filter.isSeen = true;

  const total = await Notice.countDocuments(filter);

  const notices = await Notice.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    notices,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Mark notice as seen
// @route   PUT /api/notices/:id/seen
// @access  merchant only
// ─────────────────────────────────────────
export const markAsSeen = async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) {
    return res.status(404).json({ message: "Notice not found" });
  }

  notice.isSeen = true;
  notice.seenAt = new Date();
  await notice.save();

  res.json({ message: "Notice marked as seen", notice });
};

// ─────────────────────────────────────────
// @desc    Update notice (admin)
// @route   PUT /api/notices/:id
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const updateNotice = async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!notice) {
    return res.status(404).json({ message: "Notice not found" });
  }
  res.json({ message: "Notice updated", notice });
};

// ─────────────────────────────────────────
// @desc    Delete notice (admin)
// @route   DELETE /api/notices/:id
// @access  superAdmin only
// ─────────────────────────────────────────
export const deleteNotice = async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) {
    return res.status(404).json({ message: "Notice not found" });
  }
  res.json({ message: "Notice deleted" });
};
