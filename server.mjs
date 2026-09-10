import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 10000;
const BLOGGER_ORIGIN = "https://pixelpluseshop.blogspot.com";

app.use(cors({
  origin: BLOGGER_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.status(200).send("AI Visual Content Creator backend is running.");
});

function buildImagePrompt(data) {
  const title = String(data.title || "").trim();
  const topic = String(data.topic || "Other").trim();
  const platform = String(data.platform || "Website").trim();
  const style = String(data.style || "Photorealistic").trim();
  const mood = String(data.mood || "Inspirational").trim();
  const textMode = String(data.textMode || "No text").trim();
  const customText = String(data.customText || "").trim();
  const instructions = String(data.instructions || "").trim();

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

${customText ? `CUSTOM TEXT:
${customText}` : ""}

${instructions ? `ADDITIONAL USER INSTRUCTIONS:
${instructions}` : ""}

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

If the requested text mode includes text, text may be included,
but visual storytelling must remain the primary communication method.

Most importantly:
TURN THE IDEA INTO A VISUAL STORY, NOT INTO A TEXT DESIGN.
`.trim();
}

app.post("/api/generate", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not configured. Add it to the Render Environment settings."
      });
    }

    const data = req.body || {};
    const title = String(data.title || "").trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Please enter an idea or title."
      });
    }

    const prompt = buildImagePrompt(data);
    const platform = String(data.platform || "").trim();

    let size = "1536x1024";

    if (platform === "Instagram" ||
        platform === "Pinterest" ||
        platform === "TikTok") {
      size = "1024x1536";
    }

    if (platform === "Square") {
      size = "1024x1024";
    }

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Visual Content Creator backend is running on port ${PORT}`);
});
