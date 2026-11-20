// backend/controllers/adminController.js

const User = require("../models/User");
const Photo = require("../models/Photo");
const Event = require("../models/Event");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const EventSubmission = require("../models/EventSubmission");
const { deleteImage } = require("../services/cloudinaryService");

function getPagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
}

async function getDashboard(req, res) {
    try {
        const [
            totalUsers,
            activeUsers,
            totalPhotos,
            totalEvents,
            pendingClassification,
            recentUsers,
            recentPhotos
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: "admin" } }),
            User.countDocuments({ role: { $ne: "admin" }, isActive: { $ne: false } }),
            Photo.countDocuments(),
            Event.countDocuments(),
            Photo.countDocuments({
                classificationStatus: "pending"
            }),
            User.find({ role: { $ne: "admin" } })
                .select("name email rollNumber role isActive createdAt")
                .sort({ createdAt: -1 })
                .limit(5),
            Photo.find()
                .populate("owner", "name rollNumber")
                .select("title imageUrl category classificationStatus owner createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        return res.json({
            stats: {
                totalUsers,
                activeUsers,
                deactivatedUsers: totalUsers - activeUsers,
                totalPhotos,
                totalEvents,
                pendingClassification
            },
            recentUsers,
            recentPhotos
        });
    } catch (error) {
        console.error("Admin dashboard error:", error.message);

        return res.status(500).json({
            message: "Unable to load admin dashboard"
        });
    }
}

async function getUsers(req, res) {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const search = String(req.query.search || "").trim();

        const filter = {};

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(safeSearch, "i");

            filter.$or = [
                { name: pattern },
                { email: pattern },
                { rollNumber: pattern },
                { department: pattern }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("name email rollNumber department year role isActive profilePhoto createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter)
        ]);

        return res.json({
            users,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin users error:", error.message);

        return res.status(500).json({
            message: "Unable to load student accounts"
        });
    }
}

async function setUserStatus(req, res) {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                message: "isActive must be true or false"
            });
        }

        if (id === req.userId && isActive === false) {
            return res.status(400).json({
                message: "You cannot deactivate your own administrator account"
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.isActive = isActive;
        await user.save();

        return res.json({
            message: isActive
                ? "Account reactivated successfully"
                : "Account deactivated successfully",
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error("Update account status error:", error.message);

        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        return res.status(500).json({
            message: "Unable to update account status"
        });
    }
}

async function getPhotos(req, res) {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const search = String(req.query.search || "").trim();
        const category = String(req.query.category || "").trim();

        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(safeSearch, "i");

            filter.$or = [
                { title: pattern },
                { description: pattern },
                { tags: pattern }
            ];
        }

        const [photos, total] = await Promise.all([
            Photo.find(filter)
                .populate("owner", "name email rollNumber")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Photo.countDocuments(filter)
        ]);

        return res.json({
            photos,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin photos error:", error.message);

        return res.status(500).json({
            message: "Unable to load photos"
        });
    }
}

async function deletePhotoAsAdmin(req, res) {
    try {
        const photo = await Photo.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found"
            });
        }

        // Remove the image from Cloudinary when a public ID exists.
        if (photo.publicId) {
            await deleteImage(photo.publicId);
        }

        await Promise.all([
            Like.deleteMany({ photo: photo._id }),
            Comment.deleteMany({ photo: photo._id }),
            EventSubmission.deleteMany({ photo: photo._id })
        ]);

        // Remove references to this photo from competition winners.
        await Event.updateMany(
            { "winners.photo": photo._id },
            { $pull: { winners: { photo: photo._id } } }
        );

        await photo.deleteOne();

        return res.json({
            message: "Photo removed successfully"
        });
    } catch (error) {
        console.error("Admin photo deletion error:", error.message);

        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid photo ID"
            });
        }

        return res.status(500).json({
            message: "Unable to remove photo"
        });
    }
}

async function getEvents(req, res) {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const [events, total] = await Promise.all([
            Event.find()
                .populate("organizer", "name email rollNumber")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Event.countDocuments()
        ]);

        return res.json({
            events,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin events error:", error.message);

        return res.status(500).json({
            message: "Unable to load events"
        });
    }
}

async function deleteEventAsAdmin(req, res) {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        await EventSubmission.deleteMany({
            event: event._id
        });

        await event.deleteOne();

        return res.json({
            message: "Event deleted successfully"
        });
    } catch (error) {
        console.error("Admin event deletion error:", error.message);

        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        return res.status(500).json({
            message: "Unable to delete event"
        });
    }
}

module.exports = {
    getDashboard,
    getUsers,
    setUserStatus,
    getPhotos,
    deletePhotoAsAdmin,
    getEvents,
    deleteEventAsAdmin
};