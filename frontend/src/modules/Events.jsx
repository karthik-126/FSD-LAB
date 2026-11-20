
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./api";

function toLocalDateTime(date) {
    const value = new Date(date);
    const offset = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default function Events({ user }) {
    const [events, setEvents] = useState([]);
    const [myPhotos, setMyPhotos] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "Photography Contest",
        startDate: "",
        deadline: "",
        endDate: "",
        imageUrl: ""
    });

    const [photoToSubmit, setPhotoToSubmit] = useState("");
    const [winnerPhotoId, setWinnerPhotoId] = useState("");
    const [winnerPosition, setWinnerPosition] = useState("1");

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest("/events");
            setEvents(data.events || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();

        apiRequest("/photos/mine")
            .then((data) => setMyPhotos(data.photos || []))
            .catch(() => setMyPhotos([]));
    }, [loadEvents]);

    function updateField(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function createEvent(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        try {
            const data = await apiRequest("/events", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    startDate: new Date(form.startDate).toISOString(),
                    deadline: new Date(form.deadline).toISOString(),
                    endDate: new Date(form.endDate).toISOString()
                })
            });

            setMessage("Event created successfully.");
            setShowCreate(false);
            setForm({
                title: "",
                description: "",
                category: "Photography Contest",
                startDate: "",
                deadline: "",
                endDate: "",
                imageUrl: ""
            });

            await loadEvents();
            await openEvent(data.event._id);
        } catch (err) {
            setError(err.message);
        }
    }

    async function openEvent(eventId) {
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(`/events/${eventId}`);
            setSelectedEvent(data.event);
            setSubmissions(data.submissions || []);
        } catch (err) {
            setError(err.message);
        }
    }

    async function submitPhoto(event) {
        event.preventDefault();

        if (!selectedEvent || !photoToSubmit) {
            setError("Choose one of your photos to submit.");
            return;
        }

        setError("");
        setMessage("");

        try {
            await apiRequest(`/events/${selectedEvent._id}/submit`, {
                method: "POST",
                body: JSON.stringify({
                    photoId: photoToSubmit
                })
            });

            setMessage("Your photo has been submitted.");
            await openEvent(selectedEvent._id);
        } catch (err) {
            setError(err.message);
        }
    }

    async function publishWinner(event) {
        event.preventDefault();

        if (!selectedEvent || !winnerPhotoId) {
            setError("Select a submitted photo first.");
            return;
        }

        setError("");
        setMessage("");

        try {
            await apiRequest(`/events/${selectedEvent._id}/winners`, {
                method: "PUT",
                body: JSON.stringify({
                    winners: [{
                        photoId: winnerPhotoId,
                        position: Number(winnerPosition)
                    }]
                })
            });

            setMessage("Competition winner published.");
            await openEvent(selectedEvent._id);
        } catch (err) {
            setError(err.message);
        }
    }

    async function deleteEvent() {
        if (!selectedEvent) return;

        if (!window.confirm("Delete this event and its submissions?")) {
            return;
        }

        setError("");
        setMessage("");

        try {
            await apiRequest(`/events/${selectedEvent._id}`, {
                method: "DELETE"
            });

            setSelectedEvent(null);
            setSubmissions([]);
            setMessage("Event deleted.");
            await loadEvents();
        } catch (err) {
            setError(err.message);
        }
    }

    const currentUserId = user?.id || user?._id;
    const isOrganizer = selectedEvent &&
        (selectedEvent.organizer?._id || selectedEvent.organizer) === currentUserId;

    return (
        <section className="page-container">
            <div className="page-heading events-heading">
                <div>
                    <span className="eyebrow">CAMPUS COMMUNITY</span>
                    <h1>Events & competitions</h1>
                    <p>Discover creative challenges and showcase your photography.</p>
                </div>

                <button
                    className="button button-primary"
                    onClick={() => {
                        setShowCreate((value) => !value);
                        setError("");
                    }}
                >
                    {showCreate ? "Close form" : "+ Create event"}
                </button>
            </div>

            {error && <div className="alert error">{error}</div>}
            {message && <div className="alert success">{message}</div>}

            {showCreate && (
                <form className="panel event-create-form form-stack" onSubmit={createEvent}>
                    <h2>Create a campus event</h2>

                    <label>
                        Event title
                        <input
                            name="title"
                            value={form.title}
                            onChange={updateField}
                            maxLength={150}
                            required
                        />
                    </label>

                    <label>
                        Description
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={updateField}
                            rows={3}
                            required
                        />
                    </label>

                    <label>
                        Event type
                        <select
                            name="category"
                            value={form.category}
                            onChange={updateField}
                        >
                            <option>Photography Contest</option>
                            <option>Campus Event</option>
                            <option>Workshop</option>
                            <option>Other</option>
                        </select>
                    </label>

                    <div className="form-row">
                        <label>
                            Start date
                            <input
                                type="datetime-local"
                                name="startDate"
                                value={form.startDate}
                                onChange={updateField}
                                required
                            />
                        </label>

                        <label>
                            Submission deadline
                            <input
                                type="datetime-local"
                                name="deadline"
                                value={form.deadline}
                                onChange={updateField}
                                required
                            />
                        </label>
                    </div>

                    <label>
                        Event end date
                        <input
                            type="datetime-local"
                            name="endDate"
                            value={form.endDate}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <label>
                        Banner image URL (optional)
                        <input
                            type="url"
                            name="imageUrl"
                            value={form.imageUrl}
                            onChange={updateField}
                            placeholder="https://..."
                        />
                    </label>

                    <button className="button button-primary" type="submit">
                        Create event
                    </button>
                </form>
            )}

            {loading ? (
                <div className="empty-state">
                    <p>Loading events...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏆</div>
                    <h3>No events yet</h3>
                    <p>Create an event or check again later.</p>
                </div>
            ) : (
                <div className="events-grid">
                    {events.map((event) => (
                        <article className="event-card" key={event._id}>
                            {event.imageUrl ? (
                                <img
                                    className="event-banner"
                                    src={event.imageUrl}
                                    alt={event.title}
                                />
                            ) : (
                                <div className="event-banner event-banner-placeholder">
                                    <span>✦</span>
                                    <span>CAMPUS LENS</span>
                                </div>
                            )}

                            <div className="event-card-content">
                                <div className="event-card-meta">
                                    <span className="category-badge static-badge">
                                        {event.category}
                                    </span>
                                    <span className={`event-status ${event.status}`}>
                                        {event.status}
                                    </span>
                                </div>

                                <h2>{event.title}</h2>
                                <p>{event.description}</p>

                                <div className="event-date-list">
                                    <span>
                                        <strong>Starts:</strong>{" "}
                                        {new Date(event.startDate).toLocaleString()}
                                    </span>
                                    <span>
                                        <strong>Deadline:</strong>{" "}
                                        {new Date(event.deadline).toLocaleString()}
                                    </span>
                                </div>

                                <button
                                    className="button button-outline button-full"
                                    onClick={() => openEvent(event._id)}
                                >
                                    View event & submissions
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {selectedEvent && (
                <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
                    <section
                        className="event-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">EVENT DETAILS</span>
                                <h2>{selectedEvent.title}</h2>
                            </div>
                            <button
                                className="icon-button modal-close"
                                onClick={() => setSelectedEvent(null)}
                                aria-label="Close event details"
                            >
                                ×
                            </button>
                        </div>

                        <p>{selectedEvent.description}</p>

                        <div className="event-detail-dates">
                            <p>
                                <strong>Submission deadline:</strong>{" "}
                                {new Date(selectedEvent.deadline).toLocaleString()}
                            </p>
                            <p>
                                <strong>Organizer:</strong>{" "}
                                {selectedEvent.organizer?.name || "Student"}
                            </p>
                        </div>

                        {new Date() >= new Date(selectedEvent.startDate) &&
                         new Date() <= new Date(selectedEvent.deadline) && (
                            <form className="inline-submit-form" onSubmit={submitPhoto}>
                                <label>
                                    Submit one of your photos
                                    <select
                                        value={photoToSubmit}
                                        onChange={(event) =>
                                            setPhotoToSubmit(event.target.value)
                                        }
                                        required
                                    >
                                        <option value="">Select a photo</option>
                                        {myPhotos.map((photo) => (
                                            <option key={photo._id} value={photo._id}>
                                                {photo.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <button className="button button-primary" type="submit">
                                    Submit photo
                                </button>
                            </form>
                        )}

                        <div className="modal-section">
                            <h3>Submitted photographs ({submissions.length})</h3>

                            {submissions.length === 0 ? (
                                <p className="muted-text">No submissions yet.</p>
                            ) : (
                                <div className="submission-grid">
                                    {submissions.map((submission) => (
                                        <article
                                            className="submission-card"
                                            key={submission._id}
                                        >
                                            <img
                                                src={submission.photo?.imageUrl}
                                                alt={submission.photo?.title || "Submission"}
                                            />
                                            <div>
                                                <strong>
                                                    {submission.photo?.title || "Photograph"}
                                                </strong>
                                                <p>
                                                    By {submission.user?.name || "Student"}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedEvent.winners?.length > 0 && (
                            <div className="modal-section">
                                <h3>Competition results</h3>
                                {selectedEvent.winners
                                    .slice()
                                    .sort((a, b) => a.position - b.position)
                                    .map((winner) => (
                                        <p key={`${winner.position}-${winner.photo?._id || winner.photo}`}>
                                            🏆 Position {winner.position}:{" "}
                                            {winner.user?.name || "Winner"}
                                            {" — "}
                                            {winner.photo?.title || "Winning photo"}
                                        </p>
                                    ))}
                            </div>
                        )}

                        {isOrganizer && (
                            <div className="modal-section organizer-tools">
                                <h3>Organizer controls</h3>

                                <form
                                    className="inline-submit-form"
                                    onSubmit={publishWinner}
                                >
                                    <label>
                                        Winning submitted photo
                                        <select
                                            value={winnerPhotoId}
                                            onChange={(event) =>
                                                setWinnerPhotoId(event.target.value)
                                            }
                                            required
                                        >
                                            <option value="">Select a submission</option>
                                            {submissions.map((submission) => (
                                                <option
                                                    key={submission._id}
                                                    value={submission.photo?._id}
                                                >
                                                    {submission.photo?.title} — {submission.user?.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Position
                                        <select
                                            value={winnerPosition}
                                            onChange={(event) =>
                                                setWinnerPosition(event.target.value)
                                            }
                                        >
                                            <option value="1">1st place</option>
                                            <option value="2">2nd place</option>
                                            <option value="3">3rd place</option>
                                        </select>
                                    </label>

                                    <button
                                        className="button button-primary"
                                        type="submit"
                                    >
                                        Publish winner
                                    </button>
                                </form>

                                <button
                                    className="button button-danger"
                                    onClick={deleteEvent}
                                >
                                    Delete event
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
}
