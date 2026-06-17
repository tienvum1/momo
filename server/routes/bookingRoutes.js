const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { storage } = require("../config/cloudinary");
const {
  createBooking,
  submitCustomerPaid,
  getMyBookings,
  getMyBookingDetail,
  adminGetBookings,
  adminGetBookingDetail,
  adminConfirmBooking,
  adminRejectBooking,
  getAdminStats,
} = require("../controllers/bookingController");

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ─── Customer routes ──────────────────────────────────────────────────────────
router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/my/:id", protect, getMyBookingDetail);
router.post(
  "/:id/customer-paid",
  protect,
  upload.fields([{ name: "proof", maxCount: 10 }]),
  submitCustomerPaid
);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/list", protect, authorize("admin_system"), adminGetBookings);
router.get("/admin/stats", protect, authorize("admin_system"), getAdminStats);
router.get("/admin/:id", protect, authorize("admin_system"), adminGetBookingDetail);
router.patch(
  "/admin/:id/confirm",
  protect,
  authorize("admin_system"),
  upload.array("proof", 3),
  adminConfirmBooking
);
router.patch("/admin/:id/reject", protect, authorize("admin_system"), adminRejectBooking);

module.exports = router;
