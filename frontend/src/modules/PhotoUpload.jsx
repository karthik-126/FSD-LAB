import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import "./Modules.css";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoUpload({ onUploaded }) {
    const [form, setForm] = useState({ title: "", description: "", tags: "" });
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!image) {
            setPreviewUrl("");
            return undefined;
        }
        const url = URL.createObjectURL(image);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image]);

    function handleImageChange(event) {
        const selected = event.target.files?.[0] || null;
        setMessage("");
        setMessageType("info");
        if (!selected) {
            setImage(null);
            return;
        }
        if (!ALLOWED_TYPES.includes(selected.type)) {
            setImage(null);
            event.target.value = "";
            setMessage("Choose a JPG, PNG, or WEBP image.");
            setMessageType("error");
            return;
        }
        if (selected.size > MAX_FILE_SIZE) {
            setImage(null);
            event.target.value = "";
            setMessage("The image is larger than 8 MB. Choose a smaller file.");
            setMessageType("error");
            return;
        }
        setImage(selected);
    }

    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setMessage("");
        setMessageType("info");

        if (!image) {
            setMessage("Please choose an image before uploading.");
            setMessageType("error");
            return;
        }
        if (!form.title.trim()) {
            setMessage("Please enter a title for your photograph.");
            setMessageType("error");
            return;
        }

        const body = new FormData();
        body.append("image", image);
        body.append("title", form.title.trim());
        body.append("description", form.description.trim());
        body.append("tags", form.tags);

        setBusy(true);
        try {
            const data = await apiRequest("/photos", {
                method: "POST",
                body,
                timeoutMs: 120000
            });
            setMessage(data.message || "Photo uploaded successfully.");
            setMessageType("success");
            setForm({ title: "", description: "", tags: "" });
            setImage(null);
            formElement.reset();
            if (onUploaded) onUploaded(data.photo);
        } catch (error) {
            setMessage(error.message || "Photo upload failed. Please try again.");
            setMessageType("error");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="cp-panel">
            <h2>Upload a campus photo</h2>
            <p className="cp-muted">JPG, PNG or WEBP · Maximum 8 MB</p>
            <form className="cp-form" onSubmit={submit}>
                <label>
                    Photo title
                    <input
                        required
                        maxLength={120}
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                        placeholder="Give your photo a title"
                    />
                </label>
                <label>
                    Description
                    <textarea
                        maxLength={2000}
                        rows={3}
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Add a short description (optional)"
                    />
                </label>
                <label>
                    Tags <span className="cp-muted">(comma separated)</span>
                    <input
                        value={form.tags}
                        onChange={(event) => setForm({ ...form, tags: event.target.value })}
                        placeholder="campus, sunset, fest"
                    />
                </label>
                <label>
                    Image file
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={handleImageChange}
                    />
                </label>
                {previewUrl && <img className="cp-preview" src={previewUrl} alt="Selected photo preview" />}
                <button type="submit" disabled={busy} className="cp-button">
                    {busy ? "Uploading photo… please wait" : "Upload photo"}
                </button>
            </form>
            {message && <p className={`cp-message ${messageType}`} role="status">{message}</p>}
        </section>
    );
}
