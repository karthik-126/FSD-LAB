
const Photo = require("../models/Photo");
const Like = require("../models/Like");
const Comment = require("../models/Comment");

async function toggleLike(req, res) {
    try {
        const photo = await Photo.findById(req.params.photoId);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found"
            });
        }

        const existingLike = await Like.findOne({
            photo: photo._id,
            user: req.userId
        });

        if (existingLike) {
            await existingLike.deleteOne();

            await Photo.updateOne(
                { _id: photo._id },
                { $inc: { likesCount: -1 } }
            );

            await Photo.updateOne(
                { _id: photo._id, likesCount: { $lt: 0 } },
                { $set: { likesCount: 0 } }
            );

            return res.json({
                liked: false,
                message: "Like removed"
            });
        }

        try {
            await Like.create({
                photo: photo._id,
                user: req.userId
            });

            await Photo.updateOne(
                { _id: photo._id },
                { $inc: { likesCount: 1 } }
            );
        } catch (error) {
            if (error.code !== 11000) {
                throw error;
            }
        }

        const likesCount = await Like.countDocuments({
            photo: photo._id
        });

        await Photo.updateOne(
            { _id: photo._id },
            { $set: { likesCount } }
        );

        return res.json({
            liked: true,
            likesCount,
            message: "Photo liked"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to process like"
        });
    }
}

async function addComment(req, res) {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty"
            });
        }

        if (text.trim().length > 1000) {
            return res.status(400).json({
                message: "Comment must be 1000 characters or fewer"
            });
        }

        const photo = await Photo.findById(req.params.photoId);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found"
            });
        }

        const comment = await Comment.create({
            photo: photo._id,
            user: req.userId,
            text: text.trim()
        });

        await comment.populate("user", "name profilePhoto rollNumber");

        await Photo.updateOne(
            { _id: photo._id },
            { $inc: { commentsCount: 1 } }
        );

        return res.status(201).json({
            message: "Comment added",
            comment
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to add comment"
        });
    }
}

async function getComments(req, res) {
    try {
        const photo = await Photo.findById(req.params.photoId);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found"
            });
        }

        const comments = await Comment.find({
            photo: photo._id
        })
            .populate("user", "name profilePhoto rollNumber")
            .sort({ createdAt: -1 });

        return res.json({ comments });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to retrieve comments"
        });
    }
}

async function deleteComment(req, res) {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.user.toString() !== req.userId) {
            return res.status(403).json({
                message: "You can delete only your own comments"
            });
        }

        await comment.deleteOne();

        await Photo.updateOne(
            { _id: comment.photo },
            { $inc: { commentsCount: -1 } }
        );

        await Photo.updateOne(
            {
                _id: comment.photo,
                commentsCount: { $lt: 0 }
            },
            { $set: { commentsCount: 0 } }
        );

        return res.json({
            message: "Comment deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to delete comment"
        });
    }
}

module.exports = {
    toggleLike,
    addComment,
    getComments,
    deleteComment
};
