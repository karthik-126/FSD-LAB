const cloudinary = require("cloudinary").v2;

function configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(
            "Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env."
        );
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}

function uploadImage(buffer, folder = "campus-photography") {
    return new Promise((resolve, reject) => {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return reject(new Error("The uploaded image is empty or invalid."));
        }

        try {
            configureCloudinary();
        } catch (error) {
            return reject(error);
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                if (!result?.secure_url || !result?.public_id) {
                    return reject(new Error("Cloudinary did not return an image URL and public ID."));
                }

                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        stream.on("error", reject);
        stream.end(buffer);
    });
}

async function deleteImage(publicId) {
    if (!publicId) return null;

    configureCloudinary();
    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true
    });
}

module.exports = {
    uploadImage,
    deleteImage
};
