
const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const {
    getProfile,
    updateProfile
} = require("../controllers/profileController");

const router = express.Router();

router.get("/me", verifyToken, getProfile);
router.put("/me", verifyToken, updateProfile);

module.exports = router;
