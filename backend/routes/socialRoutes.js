
const express = require("express");
const verifyToken = require("../middleware/verifyToken");

const {
    toggleLike,
    addComment,
    getComments,
    deleteComment
} = require("../controllers/socialController");

const router = express.Router();

router.post("/:photoId/like", verifyToken, toggleLike);
router.get("/:photoId/comments", getComments);
router.post("/:photoId/comments", verifyToken, addComment);
router.delete("/comments/:commentId", verifyToken, deleteComment);

module.exports = router;
