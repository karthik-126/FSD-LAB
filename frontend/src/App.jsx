import { useEffect, useState } from "react";
import {
    apiRequest,
    getSavedUser,
    saveSession,
    clearSession
} from "./modules/api";

import Gallery from "./modules/Gallery";
import PhotoUpload from "./modules/PhotoUpload";
import Events from "./modules/Events";
import ModulesHub from "./modules/ModulesHub";
import AdminDashboard from "./modules/AdminDashboard";

function AuthPage({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        name: "",
        rollNumber: "",
        department: "CSE",
        year: "2",
        email: "",
        password: "",
        confirmPassword: ""
    });

    function updateField(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (mode === "register") {
            if (form.password !== form.confirmPassword) {
                setError("Password and confirm password do not match.");
                return;
            }

            if (form.password.length < 6) {
                setError("Password must contain at least 6 characters.");
                return;
            }
        }

        setLoading(true);

        try {
            const endpoint =
                mode === "login" ? "/auth/login" : "/auth/register";

            const payload =
                mode === "login"
                    ? {
                          email: form.email.trim().toLowerCase(),
                          password: form.password
                      }
                    : {
                          name: form.name.trim(),
                          rollNumber: form.rollNumber.trim().toUpperCase(),
                          department: form.department,
                          year: Number(form.year),
                          email: form.email.trim().toLowerCase(),
                          password: form.password
                      };

            const data = await apiRequest(endpoint, {
                method: "POST",
                auth: false,
                body: JSON.stringify(payload)
            });

            if (mode === "register") {
                setSuccess(
                    data.message || "Account created! You can now log in."
                );

                setMode("login");

                setForm((current) => ({
                    ...current,
                    password: "",
                    confirmPassword: ""
                }));
            } else {
                saveSession(data.token, data.user);
                onLogin(data.user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-layout">
            <section className="auth-showcase">
                <div className="brand brand-light">
                    <span className="brand-icon">CL</span>
                    <span>Campus Lens</span>
                </div>

                <div className="showcase-content">
                    <span className="eyebrow">
                        YOUR CAMPUS. YOUR STORIES.
                    </span>

                    <h1>Every moment deserves to be remembered.</h1>

                    <p>
                        Discover campus life through the lens of your fellow
                        students. Share your best photographs, explore
                        galleries and join photography contests.
                    </p>

                    <div className="showcase-tags">
                        <span>Photography</span>
                        <span>Community</span>
                        <span>Creativity</span>
                    </div>
                </div>

                <div className="showcase-footer">
                    Built for the campus photography community.
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-card">
                    <div className="auth-heading">
                        <span className="eyebrow">
                            CAMPUS PHOTOGRAPHY PLATFORM
                        </span>

                        <h2>
                            {mode === "login"
                                ? "Welcome back"
                                : "Create your account"}
                        </h2>

                        <p>
                            {mode === "login"
                                ? "Log in to explore your campus through photography."
                                : "Register with your accepted NITW student email."}
                        </p>
                    </div>

                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={mode === "login" ? "active" : ""}
                            onClick={() => {
                                setMode("login");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            Log in
                        </button>

                        <button
                            type="button"
                            className={mode === "register" ? "active" : ""}
                            onClick={() => {
                                setMode("register");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            Register
                        </button>
                    </div>

                    {error && (
                        <div className="alert error" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert success" role="status">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="form-stack">
                        {mode === "register" && (
                            <>
                                <label>
                                    Full name
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={updateField}
                                        placeholder="Your full name"
                                        required
                                        maxLength={80}
                                    />
                                </label>

                                <label>
                                    Roll number
                                    <input
                                        name="rollNumber"
                                        value={form.rollNumber}
                                        onChange={updateField}
                                        placeholder="24CSB0A12"
                                        required
                                    />
                                </label>

                                <div className="form-row">
                                    <label>
                                        Department
                                        <select
                                            name="department"
                                            value={form.department}
                                            onChange={updateField}
                                        >
                                            <option value="CSE">CSE</option>
                                            <option value="ECE">ECE</option>
                                            <option value="EEE">EEE</option>
                                            <option value="Mechanical">
                                                Mechanical
                                            </option>
                                            <option value="Civil">Civil</option>
                                            <option value="Chemical">
                                                Chemical
                                            </option>
                                            <option value="Biotechnology">
                                                Biotechnology
                                            </option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </label>

                                    <label>
                                        Year
                                        <select
                                            name="year"
                                            value={form.year}
                                            onChange={updateField}
                                        >
                                            <option value="1">1st year</option>
                                            <option value="2">2nd year</option>
                                            <option value="3">3rd year</option>
                                            <option value="4">4th year</option>
                                        </select>
                                    </label>
                                </div>
                            </>
                        )}

                        <label>
                            Student email
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={updateField}
                                placeholder="bk24csb0a12@student.nitw.ac.in"
                                maxLength={30}
                                minLength={30}
                                autoComplete="email"
                                required
                            />
                        </label>

                        <label>
                            Password
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={updateField}
                                placeholder="At least 6 characters"
                                minLength={6}
                                autoComplete={
                                    mode === "login"
                                        ? "current-password"
                                        : "new-password"
                                }
                                required
                            />
                        </label>

                        {mode === "register" && (
                            <label>
                                Confirm password
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={updateField}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    minLength={6}
                                    required
                                />
                            </label>
                        )}

                        <button
                            className="button button-primary button-full"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "login"
                                  ? "Log in to Campus Lens"
                                  : "Create account"}
                        </button>
                    </form>

                    <p className="auth-note">
                        Student access is restricted to accepted NITW student
                        email addresses. Email OTP verification is disabled.
                    </p>
                </div>
            </section>
        </main>
    );
}

function ProfilePage({ user, onUserUpdate }) {
    const [form, setForm] = useState({
        name: user?.name || "",
        department: user?.department || "",
        year: user?.year || 1,
        bio: user?.bio || "",
        profilePhoto: user?.profilePhoto || ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setForm({
            name: user?.name || "",
            department: user?.department || "",
            year: user?.year || 1,
            bio: user?.bio || "",
            profilePhoto: user?.profilePhoto || ""
        });
    }, [user]);

    function updateField(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function submitProfile(event) {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const data = await apiRequest("/profile/me", {
                method: "PUT",
                body: JSON.stringify({
                    ...form,
                    year: Number(form.year)
                })
            });

            localStorage.setItem("campusUser", JSON.stringify(data.user));
            onUserUpdate(data.user);
            setMessage("Profile updated successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="page-container narrow-page">
            <div className="page-heading">
                <span className="eyebrow">YOUR ACCOUNT</span>
                <h1>Student profile</h1>
                <p>
                    Manage your details and introduce yourself to the
                    community.
                </p>
            </div>

            <div className="panel profile-panel">
                <div className="profile-summary">
                    {user?.profilePhoto ? (
                        <img
                            className="avatar avatar-large"
                            src={user.profilePhoto}
                            alt="Profile"
                        />
                    ) : (
                        <div className="avatar avatar-large avatar-placeholder">
                            {user?.name?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                    )}

                    <div>
                        <h2>{user?.name}</h2>
                        <p>{user?.rollNumber}</p>
                        <span className="status-pill">Student account</span>
                    </div>
                </div>

                {message && <div className="alert success">{message}</div>}
                {error && <div className="alert error">{error}</div>}

                <form className="form-stack" onSubmit={submitProfile}>
                    <label>
                        Full name
                        <input
                            name="name"
                            value={form.name}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <label>
                        Student email
                        <input value={user?.email || ""} disabled />
                    </label>

                    <label>
                        Roll number
                        <input value={user?.rollNumber || ""} disabled />
                    </label>

                    <div className="form-row">
                        <label>
                            Department
                            <input
                                name="department"
                                value={form.department}
                                onChange={updateField}
                                required
                            />
                        </label>

                        <label>
                            Year
                            <select
                                name="year"
                                value={form.year}
                                onChange={updateField}
                            >
                                <option value="1">1st year</option>
                                <option value="2">2nd year</option>
                                <option value="3">3rd year</option>
                                <option value="4">4th year</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Profile photo URL
                        <input
                            name="profilePhoto"
                            type="url"
                            value={form.profilePhoto}
                            onChange={updateField}
                            placeholder="https://..."
                        />
                    </label>

                    <label>
                        Bio
                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={updateField}
                            maxLength={300}
                            rows={4}
                            placeholder="Tell other students about yourself..."
                        />
                    </label>

                    <button
                        className="button button-primary"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save changes"}
                    </button>
                </form>
            </div>
        </section>
    );
}

export default function App() {
    const [user, setUser] = useState(getSavedUser);
    const [page, setPage] = useState("home");
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function validateSession() {
            const token = localStorage.getItem("campusToken");

            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setSessionReady(true);
                }
                return;
            }

            try {
                const data = await apiRequest("/profile/me");

                if (!cancelled) {
                    setUser(data.user);
                    localStorage.setItem(
                        "campusUser",
                        JSON.stringify(data.user)
                    );
                }
            } catch {
                if (!cancelled) {
                    clearSession();
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setSessionReady(true);
                }
            }
        }

        validateSession();

        function handleExpiredSession() {
            setUser(null);
            setPage("home");
        }

        window.addEventListener(
            "campus-session-expired",
            handleExpiredSession
        );

        return () => {
            cancelled = true;
            window.removeEventListener(
                "campus-session-expired",
                handleExpiredSession
            );
        };
    }, []);

    function logout() {
        clearSession();
        setUser(null);
        setPage("home");
    }

    if (!sessionReady) {
        return (
            <div className="loading-screen">
                <div className="loading-logo">CL</div>
                <p>Opening Campus Lens...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <AuthPage
                onLogin={(loggedInUser) => {
                    setUser(loggedInUser);
                    setPage("home");
                }}
            />
        );
    }

    const navItems = [
        { id: "home", label: "Overview" },
        { id: "gallery", label: "Explore photos" },
        { id: "upload", label: "Upload photo" },
        { id: "events", label: "Events & contests" },
        { id: "profile", label: "My profile" },
        ...(user.role === "admin"
            ? [{ id: "admin", label: "Admin dashboard" }]
            : [])
    ];

    return (
        <div className="app-shell">
            <header className="topbar">
                <button
                    className="brand"
                    onClick={() => setPage("home")}
                    type="button"
                >
                    <span className="brand-icon">CL</span>
                    <span>Campus Lens</span>
                </button>

                <nav className="main-nav">
                    {navItems.map((item) => (
                        <button
                            type="button"
                            key={item.id}
                            className={
                                page === item.id ? "nav-link active" : "nav-link"
                            }
                            onClick={() => setPage(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="topbar-user">
                    <span className="welcome-user">
                        Hi, {user.name?.split(" ")[0]}
                    </span>

                    {user.profilePhoto ? (
                        <img
                            className="avatar"
                            src={user.profilePhoto}
                            alt=""
                        />
                    ) : (
                        <span className="avatar avatar-placeholder">
                            {user.name?.charAt(0)?.toUpperCase()}
                        </span>
                    )}

                    <button
                        className="button button-outline button-small"
                        onClick={logout}
                    >
                        Log out
                    </button>
                </div>
            </header>

            <main>
                {page === "home" && (
                    <ModulesHub user={user} onNavigate={setPage} />
                )}

                {page === "gallery" && (
                    <Gallery user={user} onNavigate={setPage} />
                )}

                {page === "upload" && (
                    <PhotoUpload onUploaded={() => setPage("gallery")} />
                )}

                {page === "events" && <Events user={user} />}

                {page === "profile" && (
                    <ProfilePage user={user} onUserUpdate={setUser} />
                )}

                {page === "admin" && user.role === "admin" && (
                    <AdminDashboard user={user} />
                )}
            </main>

            <footer className="site-footer">
                <div className="brand footer-brand">
                    <span className="brand-icon">CL</span>
                    <span>Campus Lens</span>
                </div>

                <p>Capture the campus. Share the story.</p>
                <span>Campus Photography Platform</span>
            </footer>
        </div>
    );
}