
import { useCallback, useEffect, useState } from "react";
import { apiRequest, getSavedUser } from "./api";

const categories = [
    "All",
    "Nature",
    "Campus",
    "Events",
    "Sports",
    "People",
    "Other",
    "Unclassified"
];

export default function Gallery({ user }) {
    const [photos, setPhotos] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [commentsFor, setCommentsFor] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [likedIds, setLikedIds] = useState({});
    const [notice, setNotice] = useState("");

    const currentUser = user || getSavedUser();

    const loadPhotos = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "12"
            });

            if (search.trim()) params.set("search", search.trim());
            if (category !== "All") params.set("category", category);

            const data = await apiRequest(`/photos?${params.toString()}`);

            setPhotos(data.photos || []);
            setTotalPages(Math.max(1, data.totalPages || 1));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, category, page]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    async function deletePhoto(photo) {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${photo.title}"? This will also remove its likes and comments.`
        );

        if (!confirmed) return;

        try {
            await apiRequest(`/photos/${photo._id}`, {
                method: "DELETE"
            });

            setPhotos((previous) =>
                previous.filter((item) => item._id !== photo._id)
            );

            if (commentsFor === photo._id) {
                setCommentsFor(null);
                setComments([]);
            }

            setNotice("Your photo was deleted successfully.");
        } catch (err) {
            setNotice(err.message || "Could not delete this photo.");
        }
    }

    async function toggleLike(photoId) {
        try {
            const result = await apiRequest(`/social/${photoId}/like`, {
                method: "POST"
            });

            setLikedIds((previous) => ({
                ...previous,
                [photoId]: result.liked
            }));

            setPhotos((previous) =>
                previous.map((photo) =>
                    photo._id === photoId
                        ? {
                            ...photo,
                            likesCount: Math.max(
                                0,
                                (photo.likesCount || 0) +
                                    (result.liked ? 1 : -1)
                            )
                        }
                        : photo
                )
            );
        } catch (err) {
            setNotice(err.message);
        }
    }

    async function openComments(photoId) {
        setCommentsFor(photoId);
        setCommentText("");
        setNotice("");

        try {
            const data = await apiRequest(
                `/social/${photoId}/comments`
            );
            setComments(data.comments || []);
        } catch (err) {
            setNotice(err.message);
            setComments([]);
        }
    }

    async function submitComment(event) {
        event.preventDefault();

        if (!commentsFor || !commentText.trim()) return;

        try {
            const data = await apiRequest(
                `/social/${commentsFor}/comments`,
                {
                    method: "POST",
                    body: JSON.stringify({ text: commentText })
                }
            );

            setComments((previous) => [data.comment, ...previous]);
            setCommentText("");

            setPhotos((previous) =>
                previous.map((photo) =>
                    photo._id === commentsFor
                        ? {
                            ...photo,
                            commentsCount: (photo.commentsCount || 0) + 1
                        }
                        : photo
                )
            );
        } catch (err) {
            setNotice(err.message);
        }
    }

    async function deleteComment(commentId) {
        try {
            await apiRequest(`/social/comments/${commentId}`, {
                method: "DELETE"
            });

            setComments((previous) =>
                previous.filter((comment) => comment._id !== commentId)
            );

            setPhotos((previous) =>
                previous.map((photo) =>
                    photo._id === commentsFor
                        ? {
                            ...photo,
                            commentsCount: Math.max(
                                0,
                                (photo.commentsCount || 0) - 1
                            )
                        }
                        : photo
                )
            );
        } catch (err) {
            setNotice(err.message);
        }
    }

    return (
        <section className="page-container">
            <div className="page-heading gallery-heading">
                <div>
                    <span className="eyebrow">THE CAMPUS, IN PICTURES</span>
                    <h1>Explore the gallery</h1>
                    <p>Discover campus life through photographs shared by students.</p>
                </div>
            </div>

            <div className="gallery-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Search titles, descriptions or tags..."
                    aria-label="Search gallery"
                />

                <select
                    value={category}
                    onChange={(event) => {
                        setCategory(event.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by category"
                >
                    {categories.map((item) => (
                        <option key={item} value={item}>
                            {item === "All" ? "All categories" : item}
                        </option>
                    ))}
                </select>
            </div>

            {notice && (
                <div className="alert error">
                    {notice}
                    <button
                        className="alert-dismiss"
                        onClick={() => setNotice("")}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {error && <div className="alert error">{error}</div>}

            {loading ? (
                <div className="empty-state">
                    <p>Loading photographs...</p>
                </div>
            ) : photos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">▧</div>
                    <h3>No photographs found</h3>
                    <p>Try a different search or category.</p>
                </div>
            ) : (
                <div className="gallery-grid">
                    {photos.map((photo) => (
                        <article className="photo-card" key={photo._id}>
                            <div className="photo-image-wrap">
                                <img
                                    src={photo.imageUrl}
                                    alt={photo.title}
                                    className="photo-image"
                                    loading="lazy"
                                />
                                <span className="category-badge">
                                    {photo.category || "Unclassified"}
                                </span>
                            </div>

                            <div className="photo-card-body">
                                <div className="photo-author">
                                    <span className="avatar avatar-placeholder">
                                        {photo.owner?.name?.charAt(0)?.toUpperCase() || "S"}
                                    </span>
                                    <div>
                                        <strong>
                                            {photo.owner?.name || "Student"}
                                        </strong>
                                        <span>
                                            {photo.owner?.department || "Campus community"}
                                        </span>
                                    </div>
                                </div>

                                <h3>{photo.title}</h3>

                                {photo.description && (
                                    <p className="photo-description">
                                        {photo.description}
                                    </p>
                                )}

                                {photo.tags?.length > 0 && (
                                    <div className="tag-list">
                                        {photo.tags.map((tag, index) => (
                                            <span key={`${tag}-${index}`}>#{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {photo.classificationStatus === "completed" &&
                                    photo.aiLabel && (
                                        <p className="ai-caption">
                                            AI label: {photo.aiLabel}
                                            {typeof photo.confidence === "number"
                                                ? ` · ${Math.round(photo.confidence * 100)}% confidence`
                                                : ""}
                                        </p>
                                    )}

                                <div className="photo-actions">
                                    <button
                                        className={
                                            likedIds[photo._id]
                                                ? "social-button liked"
                                                : "social-button"
                                        }
                                        onClick={() => toggleLike(photo._id)}
                                    >
                                        {likedIds[photo._id] ? "♥" : "♡"}{" "}
                                        {photo.likesCount || 0}
                                    </button>

                                    <button
                                        className="social-button"
                                        onClick={() => openComments(photo._id)}
                                    >
                                        ▤ {photo.commentsCount || 0} comments
                                    </button>

                                    {(String(photo.owner?._id || photo.owner) ===
                                        String(currentUser?.id || currentUser?._id)) && (
                                        <button
                                            className="delete-photo-button"
                                            onClick={() => deletePhoto(photo)}
                                            aria-label={`Delete ${photo.title}`}
                                        >
                                            Delete photo
                                        </button>
                                    )}
                                </div>

                                {commentsFor === photo._id && (
                                    <div className="comments-panel">
                                        <div className="comments-heading">
                                            <h4>Comments</h4>
                                            <button
                                                className="icon-button"
                                                onClick={() => setCommentsFor(null)}
                                                aria-label="Close comments"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <form
                                            className="comment-form"
                                            onSubmit={submitComment}
                                        >
                                            <input
                                                value={commentText}
                                                onChange={(event) =>
                                                    setCommentText(event.target.value)
                                                }
                                                placeholder="Write a comment..."
                                                maxLength={1000}
                                            />
                                            <button
                                                className="button button-primary button-small"
                                                type="submit"
                                            >
                                                Send
                                            </button>
                                        </form>

                                        <div className="comment-list">
                                            {comments.length === 0 ? (
                                                <p className="muted-text">
                                                    No comments yet.
                                                </p>
                                            ) : comments.map((comment) => (
                                                <div
                                                    className="comment-item"
                                                    key={comment._id}
                                                >
                                                    <div>
                                                        <strong>
                                                            {comment.user?.name || "Student"}
                                                        </strong>
                                                        <p>{comment.text}</p>
                                                    </div>

                                                    {comment.user?._id === currentUser?.id ||
                                                    comment.user?._id === currentUser?._id ? (
                                                        <button
                                                            className="delete-comment"
                                                            onClick={() =>
                                                                deleteComment(comment._id)
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <div className="pagination">
                <button
                    className="button button-outline"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                >
                    ← Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                    className="button button-outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                >
                    Next →
                </button>
            </div>
        </section>
    );
}
