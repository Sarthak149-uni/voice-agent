import { generateGeminiResponse } from "../Configs/gemini.js";
import { decrypt } from "../Configs/encryption.js";
import { db, toSafeUser } from "../Configs/firebase.js";

export const getAssistantConfig = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId.length < 10) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const doc = await db.collection("users").doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = { id: doc.id, ...doc.data() };
    return res.status(200).json({ message: "Assistant config", user: toSafeUser(user) });
  } catch (error) {
    console.error("Assistant config error:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to load assistant config" });
  }
};

export const askAssistant = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res
        .status(400)
        .json({ message: "Message and UserId are required" });
    }

    // Input sanitization
    const sanitizedMessage = message.trim().slice(0, 500);

    if (sanitizedMessage.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const docRef = db.collection("users").doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = { id: doc.id, ...doc.data() };

    if (!user.geminiApiKey) {
      return res
        .status(400)
        .json({ message: "Gemini API key is not configured" });
    }

    // Check free plan limits
    if (
      user.plan === "free" &&
      user.totalMessages >= user.requestLimit
    ) {
      return res.status(429).json({ message: "Free plan limit reached" });
    }

    // Check pro plan expiry
    if (
      user.plan === "pro" &&
      new Date(user.proExpiresAt) < new Date()
    ) {
      await docRef.update({ plan: "free", updatedAt: new Date().toISOString() });
      return res.status(400).json({ message: "Pro plan expired" });
    }

    const cleanMessage = sanitizedMessage.toLowerCase();

    // ── Navigation Logic ──
    if (user.enableNavigation) {
      const navigationWords = [
        "open",
        "go",
        "start",
        "show",
        "navigate",
        "take me",
      ];

      const wantsNavigation = navigationWords.some((word) =>
        cleanMessage.startsWith(word)
      );

      if (wantsNavigation) {
        const matchedPage = user.pages.find((page) =>
          page.keywords.some((keyword) =>
            cleanMessage.includes(keyword.toLowerCase())
          )
        );

        if (matchedPage) {
          if (req.body.currentPath === matchedPage.path) {
            return res.json({
              success: true,
              response: `${matchedPage.name} is already open`,
            });
          }

          return res.json({
            success: true,
            action: "navigate",
            path: matchedPage.path,
            response: `Opening ${matchedPage.name}`,
          });
        }
      }
    }

    // ── AI Response ──
    let apiKey;
    try {
      apiKey = decrypt(user.geminiApiKey);
    } catch {
      apiKey = user.geminiApiKey; // Fallback for unencrypted legacy keys
    }

    const prompt = `
You are ${user.assistantName}.

Business Name:
${user.businessName}

Business Type:
${user.businessType}

Business Description:
${user.businessDescription}

Assistant Tone:
${user.tone}

Rules:
- Keep replies under 20 words
- Give fast direct responses
- Talk naturally like a human assistant
- Behave like a smart voice assistant
- Avoid long explanations
- NEVER use markdown, asterisks, bullet points, hashtags, or special symbols
- NEVER use abbreviations — spell out words fully
- Use simple sentences with proper punctuation (periods, commas, question marks)
- Your response will be read aloud by a text-to-speech engine, so write in a way that sounds natural when spoken
- Do not include URLs, links, or code in responses

User Question:
${sanitizedMessage}
`;

    let geminiStatus = "active";
    let aiResponse;

    try {
      const result = await generateGeminiResponse({
        prompt,
        apikey: apiKey,
      });
      aiResponse = result.text;
      geminiStatus = result.geminiStatus;
    } catch (err) {
      if (err.geminiStatus) {
        geminiStatus = err.geminiStatus;
      }
      await docRef.update({ geminiStatus, updatedAt: new Date().toISOString() });

      return res.status(500).json({
        success: false,
        message: "Assistant AI Error",
      });
    }

    // Update gemini status + message count
    const updateData = { geminiStatus, updatedAt: new Date().toISOString() };
    if (user.plan === "free") {
      updateData.totalMessages = user.totalMessages + 1;
    }

    await docRef.update(updateData);

    return res.json({
      success: true,
      aiResponse,
    });
  } catch (error) {
    console.error("Assistant error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Assistant AI Error",
    });
  }
};
