// Genuine image classification through Hugging Face Inference API.
// Add HF_TOKEN to backend/.env. Without a token, uploads remain pending classification.
const categoryForLabel = (label = "") => {
    const value = label.toLowerCase();
    if (/tree|flower|forest|mountain|lake|sea|beach|plant|garden|grass|valley|waterfall/.test(value)) return "Nature";
    if (/stadium|soccer|football|basketball|cricket|tennis|racket|sports|volleyball|swimming/.test(value)) return "Sports";
    if (/building|church|mosque|palace|library|school|college|campus|castle|dome|bell tower|architecture/.test(value)) return "Campus";
    if (/person|people|face|student|man|woman|boy|girl|crowd|group/.test(value)) return "People";
    if (/stage|microphone|balloon|parade|ceremony|wedding|concert|performance|party/.test(value)) return "Events";
    return "Other";
};
console.log("HF Token loaded:", !!process.env.HF_TOKEN);
async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === "AbortError") throw new Error("Request timed out while contacting the image classification service");
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function classifyImage(imageUrl) {
    if (!process.env.HF_TOKEN) {
        return {
            status: "pending", category: "Unclassified", aiLabel: "", confidence: null,
            message: "Add HF_TOKEN to backend/.env to enable AI classification."
        };
    }

    const imageResponse = await fetchWithTimeout(imageUrl, {}, 20000);
    if (!imageResponse.ok) throw new Error("Could not download image for classification");
    const imageBytes = await imageResponse.arrayBuffer();
    const response = await fetchWithTimeout(
        "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": imageResponse.headers.get("content-type") || "application/octet-stream"
            },
            body: imageBytes
        },
        20000
    );
    if (!response.ok) throw new Error(`AI classification service returned ${response.status}`);
    const predictions = await response.json();
    if (!Array.isArray(predictions) || predictions.length === 0) throw new Error("AI service returned no predictions");
    const best = predictions.reduce((a, b) => (b.score || 0) > (a.score || 0) ? b : a);
    return {
        status: "completed",
        category: categoryForLabel(best.label),
        aiLabel: best.label,
        confidence: Number((best.score || 0).toFixed(4)),
        message: "Classification completed"
    };
}

module.exports = { classifyImage };
