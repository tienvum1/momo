const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { getRevenueStats } = require("../controllers/revenueController");

router.get("/", protect, authorize("admin_system"), getRevenueStats);

module.exports = router;
