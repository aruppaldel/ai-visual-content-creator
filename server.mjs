import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = Number(process.env.PORT || 10000);

// Set TOOL_ORIGIN in Render to the exact Blogger page origin, for example:
// https://upgradeyourlifehack.blogspot.com
// Do not put a trailing slash in the value.
const TOOL_ORIGIN = String(process.env.TOOL_ORIGIN || "").trim().replace(/\/$/, "");

const allowedOrigins = TOOL_ORIGIN ? [TOOL_ORIGIN] : [];

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server/health checks with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by TOOL_ORIGIN."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "1mb" }));

function getClient() {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

app.get("/", (_req, res) => {
  res.status(200).send("AI Visual Content Creator backend is running.");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "AI Visual Content Creator",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    toolOriginConfigured: Boolean(TOOL_ORIGIN)
  });
});

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildImagePrompt(data) {
  const title = clean(data.title);
  const topic = clean(data.topic, "Other");
  const platform = clean(data.platform, "Website");
  const style = clean(data.style, "Photorealistic");
  const mood = clean(data.mood, "Inspirational");
  const textMode = clean(data.textMode, "No text");
  const customText = clean(data.customText);
  const instructions = clean(data.instructions);
  const textPosition = clean(data.textPosition, "Not applicable");

  return `
Create ONE ORIGINAL, PROFESSIONAL AI-GENERATED VISUAL IMAGE.

CORE IDEA:
"${title}"

CONTENT TOPIC:
${topic}

TARGET PLATFORM:
${platform}

VISUAL STYLE:
${style}

MOOD:
${mood}

TEXT PREFERENCE:
${textMode}

TEXT POSITION:
${textPosition}

${customText ? `CUSTOM TEXT:\n${customText}\n` : ""}
${instructions ? `ADDITIONAL USER INSTRUCTIONS:\n${instructions}\n` : ""}

IMPORTANT CREATIVE DIRECTION:

The image must communicate the meaning of the core idea visually.

Do NOT simply place the user's title on a background.

Do NOT create:
- a plain gradient background
- a generic text card
- a Canva-style template
- a presentation slide
- a quotation card
- an abstract background with words
- a meaningless decorative composition

Instead, independently interpret the idea and create the strongest possible visual story.

Use an appropriate:
- real-world scene
- visual metaphor
- human action
- transformation
- environmental storytelling
- before-and-after contrast
- symbolic situation
- meaningful object interaction
- progression or journey

The viewer should be able to understand the central message by looking at the image EVEN IF ALL TEXT IS REMOVED.

Create:
- one strong visual concept
- a clear focal subject
- meaningful environment
- strong composition
- realistic depth and perspective
- believable lighting
- professional visual hierarchy
- appropriate camera angle
- appropriate scale
- natural details
- polished professional finish

The visual should feel like a professionally commissioned editorial,
advertising, campaign, magazine or premium social-media image.

Do not make the image look like a cheap AI poster.

If the requested text mode includes text, include the requested text naturally and legibly, while keeping visual storytelling as the primary communication method.

Most importantly:
TURN THE IDEA INTO A VISUAL STORY, NOT INTO A TEXT DESIGN.
`.trim();
}

function chooseSize(platform) {
  const value = clean(platform).toLowerCase();

  if (["instagram", "pinterest", "tiktok", "reel", "short", "youtube shorts"].includes(value)) {
    return "1024x1536";
  }

  if (value === "square") {
    return "1024x1024";
  }

  return "1536x1024";
}

app.post("/api/generate", async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const title = clean(data.title);

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Please enter an idea or title."
      });
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not configured on the backend. Add it to the Render Environment settings."
      });
    }

    const prompt = buildImagePrompt(data);
    const size = chooseSize(data.platform);

    const result = await client.images.generate({
      model: "gpt-image-2",
      prompt,
      size,
      quality: "high"
    });

    const imageBase64 = result?.data?.[0]?.b64_json;

    if (!imageBase64) {
      return res.status(502).json({
        success: false,
        error: "The AI image service did not return an image."
      });
    }

    return res.status(200).json({
      success: true,
      image: imageBase64,
      mimeType: "image/png",
      size
    });
  } catch (error) {
    console.error("IMAGE GENERATION ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "The AI image could not be generated. Please try again."
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Origin not allowed by TOOL_ORIGIN.") {
    return res.status(403).json({ success: false, error: "This website is not authorized to use the image-generation service." });
  }
  console.error("SERVER ERROR:", error);
  return res.status(500).json({ success: false, error: "Server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Visual Content Creator backend is running on port ${PORT}`);
});
