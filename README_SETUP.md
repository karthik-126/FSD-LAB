# Campus Photography Platform

## Setup

### 1. Backend

1. Open a terminal in `backend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in your own MongoDB, JWT and Cloudinary values in `backend/.env`.
5. Start the backend with `npm run dev`.

The backend requires `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. `HF_TOKEN` is optional; without it, photos can still upload but AI classification remains pending.

### 2. Frontend

1. Open a second terminal in `frontend`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

If your backend runs at a different address, create `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`.

## Photo uploads

The upload form sends the image as multipart field `image`. Supported formats are JPEG, PNG and WebP, up to 8 MB. Cloudinary credentials must be valid and belong to the same Cloudinary product environment.

In development, Cloudinary upload errors are returned in the API response under `details` and printed in the backend terminal. Never share your `.env` file or API secret.

## Administrator dashboard and registration

- The administrator API is mounted at `/api/admin` and is protected by the token and administrator-role middleware.
- The overview counts student accounts (excluding administrator accounts), including older accounts that do not yet have a `role` field.
- Dashboard overview statistics refresh every 15 seconds and when the browser tab regains focus.
- Registration includes a Confirm password field. Both password values must match; only the original password is sent to the backend and stored as a hash.

## Delete an uploaded photo

In the Gallery, a signed-in student sees a **Delete photo** button on photos they uploaded. The app asks for confirmation before deleting. The backend checks photo ownership, removes related likes, comments, and event submissions, deletes the image from Cloudinary, and then removes the photo record from MongoDB. Students cannot delete another student's photo.
