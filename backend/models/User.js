const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    rollNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },

    // Default true keeps existing accounts working after this update.
    // New registrations explicitly set this to false until OTP verification.
    isEmailVerified: { type: Boolean, default: true },
    emailVerificationOtpHash: { type: String, default: undefined, select: false },
    emailVerificationOtpExpiresAt: { type: Date, default: undefined, select: false },
    emailVerificationOtpRequestedAt: { type: Date, default: undefined, select: false },
    emailVerificationOtpAttempts: { type: Number, default: 0, select: false },

    // Admin support; users must never be allowed to set their own role at registration.
    role: { type: String, enum: ["student", "admin"], default: "student" },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
