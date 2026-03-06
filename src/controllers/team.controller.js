import Merchant from "../models/merchant.model.js";
import User from "../models/user.model.js";

// @desc    Get the entire platform's affiliate tree
// @route   GET /api/team
// @access  superAdmin, merchantAdmin
export const getTeamTree = async (req, res) => {
  try {
    // 1. Fetch all merchants, populate their user details and referrer
    const merchants = await Merchant.find()
      .populate("user", "username status createdAt")
      .populate("referrer", "username role")
      .lean();

    // 2. Build the Tree Hierarchy (MLM Logic)
    const merchantMap = {};
    const roots = [];

    // Initialize map using the User ID as the key (since referrer points to User ID)
    merchants.forEach((m) => {
      if (m.user && m.user._id) {
        merchantMap[m.user._id.toString()] = {
          ...m,
          children: [],
          teamSize: 0,
        };
      }
    });

    // Connect children to parents
    merchants.forEach((m) => {
      if (m.user && m.user._id) {
        const currentMerchant = merchantMap[m.user._id.toString()];

        // If this merchant has a referrer, and that referrer is in our map
        if (
          m.referrer &&
          m.referrer._id &&
          merchantMap[m.referrer._id.toString()]
        ) {
          merchantMap[m.referrer._id.toString()].children.push(currentMerchant);
        } else {
          // If no referrer, or referrer is a top-level Admin, they are a Root node
          roots.push(currentMerchant);
        }
      }
    });

    // Helper function to calculate total team sizes dynamically
    const calculateTeamSize = (node) => {
      let size = node.children.length;
      for (const child of node.children) {
        size += calculateTeamSize(child);
      }
      node.teamSize = size;
      return size;
    };

    // Calculate sizes for all roots
    roots.forEach((root) => calculateTeamSize(root));

    // Sort roots by team size (largest teams at the top)
    roots.sort((a, b) => b.teamSize - a.teamSize);

    res.json({ tree: roots, totalMerchants: merchants.length });
  } catch (error) {
    console.error("Team Tree Error:", error);
    res.status(500).json({ message: error.message });
  }
};
