
const User = require("../models/User");

function formatUser(user) {
    return {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        email: user.email,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        role: user.role || "student",
        isActive: user.isActive !== false
    };
}

async function getProfile(req, res) {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "Student profile not found"
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been deactivated"
            });
        }

        return res.json({
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Unable to retrieve profile"
        });
    }
}

async function updateProfile(req, res) {
    try {
        const {
            name,
            department,
            year,
            bio,
            profilePhoto
        } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Name cannot be empty"
                });
            }

            updates.name = name.trim();
        }

        if (department !== undefined) {
            if (
                typeof department !== "string" ||
                !department.trim()
            ) {
                return res.status(400).json({
                    message: "Department cannot be empty"
                });
            }

            updates.department = department.trim();
        }

        if (year !== undefined) {
            const numericYear = Number(year);

            if (
                !Number.isInteger(numericYear) ||
                numericYear < 1 ||
                numericYear > 4
            ) {
                return res.status(400).json({
                    message: "Year must be between 1 and 4"
                });
            }

            updates.year = numericYear;
        }

        if (bio !== undefined) {
            if (
                typeof bio !== "string" ||
                bio.length > 300
            ) {
                return res.status(400).json({
                    message: "Bio must be 300 characters or fewer"
                });
            }

            updates.bio = bio.trim();
        }

        if (profilePhoto !== undefined) {
            if (typeof profilePhoto !== "string") {
                return res.status(400).json({
                    message: "Profile photo must be a URL"
                });
            }

            updates.profilePhoto = profilePhoto.trim();
        }

        // Role, email, roll number and account status
        // cannot be changed through profile editing.

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "Student profile not found"
            });
        }

        return res.json({
            message: "Profile updated successfully",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Update profile error:", error);

        return res.status(500).json({
            message: "Unable to update profile"
        });
    }
}

module.exports = {
    getProfile,
    updateProfile
};
