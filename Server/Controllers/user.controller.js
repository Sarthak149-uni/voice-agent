import { encrypt } from "../Configs/encryption.js";
import { db, toSafeUser } from "../Configs/firebase.js";

export const getCurrentUser = async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.userId).get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: "Failed to get current user" });
    }

    const user = { id: doc.id, ...doc.data() };
    return res.status(200).json(toSafeUser(user));
  } catch (error) {
    console.error("getCurrentUser error:", error.message);
    return res.status(500).json({ message: "Failed to fetch user data" });
  }
};

export const saveAssistant = async (req, res) => {
  try {
    const {
      assistantName,
      businessName,
      businessType,
      businessDescription,
      tone,
      theme,
      geminiApiKey,
      pages,
    } = req.body;

    // Validate required fields
    if (!assistantName || !businessName || !businessType || !businessDescription) {
      return res
        .status(400)
        .json({ message: "All business fields are required" });
    }

    // Validate field lengths
    if (assistantName.length > 50) {
      return res
        .status(400)
        .json({ message: "Assistant name must be under 50 characters" });
    }

    if (businessDescription.length > 2000) {
      return res
        .status(400)
        .json({ message: "Business description must be under 2000 characters" });
    }

    const docRef = db.collection("users").doc(req.userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: "Failed to get current user" });
    }

    // Build update object
    const updateData = {
      assistantName: assistantName.trim(),
      businessName: businessName.trim(),
      businessType: businessType.trim(),
      businessDescription: businessDescription.trim(),
      tone,
      theme,
      geminiStatus: "active",
      pages: pages || [],
      isSetupComplete: true,
      updatedAt: new Date().toISOString(),
    };

    // Encrypt and store the Gemini API key
    if (geminiApiKey) {
      try {
        updateData.geminiApiKey = encrypt(geminiApiKey);
      } catch {
        // If encryption fails (key not configured), store as-is
        updateData.geminiApiKey = geminiApiKey;
      }
    }

    await docRef.update(updateData);

    // Fetch updated doc for response
    const updatedDoc = await docRef.get();
    const user = { id: updatedDoc.id, ...updatedDoc.data() };

    return res.status(200).json({
      message: "Assistant saved successfully",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("saveAssistant error:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to save assistant" });
  }
};
