import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./api";

const PAGE_SIZE = 10;

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function StatCard({ label, value, detail, icon }) {
    return (
        <article className="admin-stat-card">
            <div className="admin-stat-top">
                <span className="admin-stat-icon">{icon}</span>
                <span className="admin-stat-label">{label}</span>
            </div>
            <strong className="admin-stat-value">{value ?? 0}</strong>
            <span className="admin-stat-detail">{detail}</span>
        </article>
    );
}

function Pagination({ page, totalPages, onChange }) {
    if (!totalPages || totalPages <= 1) return null;

    return (
        <div className="admin-pagination">
            <button
                className="button button-outline button-small"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                type="button"
            >
                Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
                className="button button-outline button-small"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                type="button"
            >
                Next
            </button>
        </div>
    );
}

export default function AdminDashboard({ user }) {
    const [tab, setTab] = useState("overview");
    const [stats, setStats] = useState({});
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentPhotos, setRecentPhotos] = useState([]);
    const [users, setUsers] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadDashboard = useCallback(async () => {
        const data = await apiRequest("/admin/dashboard");
        setStats(data.stats || data.dashboard || data);
        setRecentUsers(data.recentUsers || []);
        setRecentPhotos(data.recentPhotos || []);
    }, []);

    const loadList = useCallback(async (selectedTab, currentPage, currentSearch) => {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(PAGE_SIZE)
        });
        if (currentSearch.trim()) params.set("search", currentSearch.trim());

        let endpoint = "";
        if (selectedTab === "users") endpoint = "/admin/users";
        if (selectedTab === "photos") endpoint = "/admin/photos";
        if (selectedTab === "events") endpoint = "/admin/events";
        if (!endpoint) return;

        const data = await apiRequest(`${endpoint}?${params.toString()}`);
        const list = selectedTab === "users"
            ? (data.users || [])
            : selectedTab === "photos"
                ? (data.photos || [])
                : (data.events || []);

        if (selectedTab === "users") setUsers(list);
        if (selectedTab === "photos") setPhotos(list);
        if (selectedTab === "events") setEvents(list);
        setTotalPages(Math.max(1, Number(data.totalPages) || 1));
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            if (tab === "overview") {
                await loadDashboard();
            } else {
                await loadList(tab, page, search);
            }
        } catch (err) {
            setError(err.message || "Unable to load administrator data.");
        } finally {
            setLoading(false);
        }
    }, [tab, page, search, loadDashboard, loadList]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Refresh overview statistics periodically and whenever the admin returns to the tab.
    useEffect(() => {
        if (tab !== "overview") return undefined;

        const refreshOverview = () => {
            loadDashboard().catch((err) => {
                setError(err.message || "Unable to refresh dashboard statistics.");
            });
        };

        const intervalId = window.setInterval(refreshOverview, 15000);
        window.addEventListener("focus", refreshOverview);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOverview);
        };
    }, [tab, loadDashboard]);

    function changeTab(nextTab) {
        setTab(nextTab);
        setPage(1);
        setSearch("");
        setError("");
        setMessage("");
    }

    async function toggleUserStatus(targetUser) {
        const nextStatus = targetUser.isActive === false;
        const action = nextStatus ? "reactivate" : "deactivate";
        if (!window.confirm(`Are you sure you want to ${action} ${targetUser.name || "this account"}?`)) return;

        setActionId(String(targetUser._id || targetUser.id));
        setError("");
        setMessage("");
        try {
            await apiRequest(`/admin/users/${targetUser._id || targetUser.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: nextStatus })
            });
            setMessage(`Account ${nextStatus ? "reactivated" : "deactivated"} successfully.`);
            await loadList("users", page, search);
            await loadDashboard();
        } catch (err) {
            setError(err.message || "Unable to update account status.");
        } finally {
            setActionId("");
        }
    }

    async function deletePhoto(photo) {
        if (!window.confirm(`Permanently delete “${photo.title || "this photo"}”? This also removes its related likes, comments and event submissions.`)) return;

        const id = String(photo._id || photo.id);
        setActionId(id);
        setError("");
        setMessage("");
        try {
            await apiRequest(`/admin/photos/${id}`, { method: "DELETE" });
            setMessage("Photo deleted successfully.");
            await loadList("photos", page, search);
            await loadDashboard();
        } catch (err) {
            setError(err.message || "Unable to delete photo.");
        } finally {
            setActionId("");
        }
    }

    async function deleteEvent(event) {
        if (!window.confirm(`Permanently delete the event “${event.title || "Untitled event"}” and its submissions?`)) return;

        const id = String(event._id || event.id);
        setActionId(id);
        setError("");
        setMessage("");
        try {
            await apiRequest(`/admin/events/${id}`, { method: "DELETE" });
            setMessage("Event deleted successfully.");
            await loadList("events", page, search);
            await loadDashboard();
        } catch (err) {
            setError(err.message || "Unable to delete event.");
        } finally {
            setActionId("");
        }
    }

    async function submitSearch(event) {
        event.preventDefault();
        setPage(1);
        setLoading(true);
        setError("");
        try {
            await loadList(tab, 1, search);
        } catch (err) {
            setError(err.message || "Search failed.");
        } finally {
            setLoading(false);
        }
    }

    const statValues = {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        deactivatedUsers: stats.deactivatedUsers,
        totalPhotos: stats.totalPhotos,
        totalEvents: stats.totalEvents,
        pendingClassification: stats.pendingClassification
    };

    return (
        <section className="page-container admin-page">
            <div className="admin-hero">
                <div>
                    <span className="eyebrow">CAMPUS LENS · CONTROL CENTRE</span>
                    <h1>Admin dashboard</h1>
                    <p>Manage student accounts, shared photographs and campus events.</p>
                    <span className="admin-welcome">Signed in as {user?.name || "Administrator"}</span>
                </div>
                <div className="admin-hero-mark" aria-hidden="true">✦</div>
            </div>

            <div className="admin-tabs" role="tablist" aria-label="Admin sections">
                {[
                    { id: "overview", label: "Overview" },
                    { id: "users", label: "Users" },
                    { id: "photos", label: "Photos" },
                    { id: "events", label: "Events" }
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        className={tab === item.id ? "admin-tab active" : "admin-tab"}
                        onClick={() => changeTab(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {error && <div className="alert error" role="alert">{error}</div>}
            {message && <div className="alert success" role="status">{message}</div>}

            {tab !== "overview" && (
                <form className="admin-search" onSubmit={submitSearch}>
                    <div>
                        <label htmlFor="admin-search-input">Search {tab}</label>
                        <p>Find {tab} by their available details.</p>
                    </div>
                    <input
                        id="admin-search-input"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={tab === "users" ? "Name, email, roll number..." : tab === "photos" ? "Photo title or description..." : "Event title..."}
                    />
                    <button className="button button-primary" type="submit">Search</button>
                </form>
            )}

            {loading ? (
                <div className="admin-loading"><span className="admin-spinner" />Loading {tab === "overview" ? "dashboard" : tab}...</div>
            ) : tab === "overview" ? (
                <>
                    <div className="admin-stats-grid">
                        <StatCard label="Total students" value={statValues.totalUsers} detail="Registered accounts" icon="♙" />
                        <StatCard label="Active accounts" value={statValues.activeUsers} detail="Can access the platform" icon="✓" />
                        <StatCard label="Deactivated" value={statValues.deactivatedUsers} detail="Access currently disabled" icon="⊘" />
                        <StatCard label="Photographs" value={statValues.totalPhotos} detail="Community uploads" icon="▧" />
                        <StatCard label="Events" value={statValues.totalEvents} detail="Campus activities and contests" icon="✧" />
                        <StatCard label="Awaiting AI labels" value={statValues.pendingClassification} detail="Pending classification" icon="◈" />
                    </div>

                    <div className="admin-overview-grid">
                        <section className="panel admin-list-panel">
                            <div className="admin-section-heading">
                                <div><span className="eyebrow">COMMUNITY</span><h2>Recently joined</h2></div>
                                <button className="admin-text-button" onClick={() => changeTab("users")} type="button">Manage users →</button>
                            </div>
                            {recentUsers.length ? recentUsers.map((item) => (
                                <div className="admin-mini-row" key={item._id || item.id}>
                                    <span className="admin-mini-avatar">{item.name?.charAt(0)?.toUpperCase() || "S"}</span>
                                    <span className="admin-mini-main"><strong>{item.name || "Unnamed student"}</strong><small>{item.rollNumber || item.email}</small></span>
                                    <span className={`admin-role ${item.role === "admin" ? "admin-role-admin" : ""}`}>{item.role || "student"}</span>
                                </div>
                            )) : <p className="admin-empty-small">No user records to display yet.</p>}
                        </section>

                        <section className="panel admin-list-panel">
                            <div className="admin-section-heading">
                                <div><span className="eyebrow">LATEST UPLOADS</span><h2>Recent photographs</h2></div>
                                <button className="admin-text-button" onClick={() => changeTab("photos")} type="button">Manage photos →</button>
                            </div>
                            {recentPhotos.length ? recentPhotos.map((photo) => (
                                <div className="admin-mini-row" key={photo._id || photo.id}>
                                    {photo.imageUrl ? <img className="admin-mini-photo" src={photo.imageUrl} alt="" /> : <span className="admin-mini-photo admin-mini-photo-empty">▧</span>}
                                    <span className="admin-mini-main"><strong>{photo.title || "Untitled photograph"}</strong><small>By {photo.owner?.name || photo.owner?.email || "Student"}</small></span>
                                    <span className="admin-category">{photo.category || "Unclassified"}</span>
                                </div>
                            )) : <p className="admin-empty-small">No photographs to display yet.</p>}
                        </section>
                    </div>
                </>
            ) : tab === "users" ? (
                <section className="panel admin-table-panel">
                    <div className="admin-section-heading"><div><span className="eyebrow">ACCOUNT CONTROL</span><h2>Student accounts</h2><p>Deactivate or restore account access. Admin roles cannot be changed here.</p></div><span className="admin-count">{users.length} shown</span></div>
                    {users.length ? (
                        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Roll number</th><th>Department</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>
                            {users.map((item) => {
                                const id = String(item._id || item.id);
                                const active = item.isActive !== false;
                                const isSelf = id === String(user?._id || user?.id);
                                return <tr key={id}>
                                    <td><strong>{item.name || "—"}</strong><small>{item.email || "—"}</small></td>
                                    <td>{item.rollNumber || "—"}</td><td>{item.department || "—"}</td>
                                    <td><span className={`admin-role ${item.role === "admin" ? "admin-role-admin" : ""}`}>{item.role || "student"}</span></td>
                                    <td><span className={`admin-status ${active ? "is-active" : "is-inactive"}`}>{active ? "Active" : "Deactivated"}</span></td>
                                    <td><button type="button" className={`button button-small ${active ? "button-danger" : "button-primary"}`} disabled={isSelf || actionId === id} onClick={() => toggleUserStatus(item)}>{actionId === id ? "Saving..." : active ? "Deactivate" : "Reactivate"}</button></td>
                                </tr>;
                            })}
                        </tbody></table></div>
                    ) : <div className="admin-empty">No users match this search.</div>}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </section>
            ) : tab === "photos" ? (
                <section className="panel admin-table-panel">
                    <div className="admin-section-heading"><div><span className="eyebrow">CONTENT MODERATION</span><h2>Uploaded photographs</h2><p>Remove inappropriate or unwanted content from the platform.</p></div><span className="admin-count">{photos.length} shown</span></div>
                    {photos.length ? <div className="admin-photo-grid">{photos.map((photo) => {
                        const id = String(photo._id || photo.id);
                        return <article className="admin-photo-card" key={id}>
                            {photo.imageUrl ? <img src={photo.imageUrl} alt={photo.title || "Campus photograph"} /> : <div className="admin-photo-placeholder">▧</div>}
                            <div className="admin-photo-info"><span className="admin-category">{photo.category || "Unclassified"}</span><h3>{photo.title || "Untitled photograph"}</h3><p>{photo.description || "No description"}</p><small>By {photo.owner?.name || photo.owner?.email || "Student"}</small><div className="admin-photo-actions"><span>♥ {photo.likesCount || 0}</span><button type="button" className="button button-danger button-small" disabled={actionId === id} onClick={() => deletePhoto(photo)}>{actionId === id ? "Deleting..." : "Delete photo"}</button></div></div>
                        </article>;
                    })}</div> : <div className="admin-empty">No photos match this search.</div>}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </section>
            ) : (
                <section className="panel admin-table-panel">
                    <div className="admin-section-heading"><div><span className="eyebrow">CAMPUS ACTIVITIES</span><h2>Events and competitions</h2><p>Review events and remove events that should no longer be listed.</p></div><span className="admin-count">{events.length} shown</span></div>
                    {events.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event</th><th>Organizer</th><th>Category</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead><tbody>
                        {events.map((event) => {
                            const id = String(event._id || event.id);
                            return <tr key={id}><td><strong>{event.title || "Untitled event"}</strong><small>{event.description || "No description"}</small></td><td>{event.organizer?.name || "—"}</td><td>{event.category || "—"}</td><td>{formatDate(event.deadline)}</td><td><span className="admin-status">{event.status || "—"}</span></td><td><button type="button" className="button button-danger button-small" disabled={actionId === id} onClick={() => deleteEvent(event)}>{actionId === id ? "Deleting..." : "Delete event"}</button></td></tr>;
                        })}
                    </tbody></table></div> : <div className="admin-empty">No events match this search.</div>}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </section>
            )}
        </section>
    );
}
