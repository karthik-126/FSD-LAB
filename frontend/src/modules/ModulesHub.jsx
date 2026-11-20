
import { useEffect, useState } from "react";
import { apiRequest } from "./api";

export default function ModulesHub({ user, onNavigate }) {
    const [stats, setStats] = useState({
        photos: 0,
        events: 0,
        likes: 0
    });

    const [recentPhotos, setRecentPhotos] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            try {
                const [galleryData, eventsData, myPhotosData] =
                    await Promise.all([
                        apiRequest("/photos?limit=6"),
                        apiRequest("/events"),
                        apiRequest("/photos/mine")
                    ]);

                if (!active) return;

                const photos = galleryData.photos || [];

                setRecentPhotos(photos);

                setStats({
                    photos: myPhotosData.photos?.length || 0,
                    events: eventsData.events?.length || 0,
                    likes: (myPhotosData.photos || []).reduce(
                        (total, photo) => total + (photo.likesCount || 0),
                        0
                    )
                });
            } catch (err) {
                if (active) setError(err.message);
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, []);

    const features = [
        {
            icon: "▧",
            title: "Explore the gallery",
            description: "Discover photographs captured by students across campus.",
            action: "gallery",
            link: "Browse photos"
        },
        {
            icon: "↥",
            title: "Share your photos",
            description: "Upload your best shots and let others discover your work.",
            action: "upload",
            link: "Upload a photo"
        },
        {
            icon: "✦",
            title: "AI photo categories",
            description: "Use image classification to organize photos by their content.",
            action: "gallery",
            link: "Explore categories"
        },
        {
            icon: "♡",
            title: "Community interaction",
            description: "Like photographs and leave comments for other students.",
            action: "gallery",
            link: "Meet the community"
        },
        {
            icon: "🏆",
            title: "Events and competitions",
            description: "Join photography contests and submit your own images.",
            action: "events",
            link: "View competitions"
        },
        {
            icon: "◎",
            title: "Your student profile",
            description: "Update your bio and keep your student details current.",
            action: "profile",
            link: "Edit profile"
        }
    ];

    return (
        <div className="page-container">
            <section className="dashboard-hero">
                <div className="hero-copy">
                    <span className="eyebrow">THE CAMPUS, THROUGH YOUR LENS</span>
                    <h1>
                        Welcome back, {user.name?.split(" ")[0] || "Student"}.
                    </h1>
                    <p>
                        Every photograph tells a story. Explore campus moments,
                        share your creativity and connect with fellow photographers.
                    </p>
                    <div className="hero-actions">
                        <button
                            className="button button-light"
                            onClick={() => onNavigate("gallery")}
                        >
                            Explore gallery <span>↗</span>
                        </button>
                        <button
                            className="button button-glass"
                            onClick={() => onNavigate("upload")}
                        >
                            Upload photo
                        </button>
                    </div>
                </div>

                <div className="hero-art" aria-hidden="true">
                    <div className="hero-orbit orbit-one"></div>
                    <div className="hero-orbit orbit-two"></div>
                    <div className="hero-camera">◎</div>
                    <div className="hero-art-label">CAPTURE THE MOMENT</div>
                </div>
            </section>

            {error && <div className="alert error">{error}</div>}

            <section className="stats-grid">
                <article className="stat-card">
                    <span className="stat-icon">▧</span>
                    <div>
                        <p>Your uploaded photos</p>
                        <strong>{stats.photos}</strong>
                    </div>
                </article>

                <article className="stat-card">
                    <span className="stat-icon">♡</span>
                    <div>
                        <p>Likes received</p>
                        <strong>{stats.likes}</strong>
                    </div>
                </article>

                <article className="stat-card">
                    <span className="stat-icon">🏆</span>
                    <div>
                        <p>Available events</p>
                        <strong>{stats.events}</strong>
                    </div>
                </article>
            </section>

            <section className="section-block">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">YOUR CREATIVE SPACE</span>
                        <h2>Explore what you can do</h2>
                    </div>
                </div>

                <div className="feature-grid">
                    {features.map((feature, index) => (
                        <article className="feature-card" key={feature.title}>
                            <span className={`feature-icon feature-${index}`}>
                                {feature.icon}
                            </span>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                            <button
                                className="text-link"
                                onClick={() => onNavigate(feature.action)}
                            >
                                {feature.link} <span>→</span>
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section-block">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">FRESH FROM THE COMMUNITY</span>
                        <h2>Recently shared</h2>
                    </div>
                    <button
                        className="text-link"
                        onClick={() => onNavigate("gallery")}
                    >
                        View all photos →
                    </button>
                </div>

                {recentPhotos.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">▧</div>
                        <h3>Your campus gallery starts here</h3>
                        <p>Be among the first to share a photograph with the community.</p>
                        <button
                            className="button button-primary"
                            onClick={() => onNavigate("upload")}
                        >
                            Upload your first photo
                        </button>
                    </div>
                ) : (
                    <div className="recent-grid">
                        {recentPhotos.slice(0, 6).map((photo) => (
                            <article className="recent-photo" key={photo._id}>
                                <img src={photo.imageUrl} alt={photo.title} />
                                <div className="recent-photo-info">
                                    <h3>{photo.title}</h3>
                                    <p>{photo.category}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
