import { genToken } from "../Configs/token.js";
import { db, docToUserSafe } from "../Configs/firebase.js";

const isProduction = () => process.env.NODE_ENV === "production";

export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res
        .status(400)
        .json({ message: "Name and Email are required" });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if user exists
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    let userId;
    let userData;

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      userId = doc.id;
      userData = { id: doc.id, ...doc.data() };
    } else {
      // Create new user with defaults
      const newUser = {
        name,
        email,
        assistantName: "Ellira",
        businessName: "",
        businessType: "",
        businessDescription: "",
        tone: "friendly",
        theme: "dark",
        enableVoice: true,
        pages: [],
        enableNavigation: true,
        geminiApiKey: "",
        geminiStatus: "active",
        totalMessages: 0,
        plan: "free",
        requestLimit: 200,
        proExpiresAt: null,
        isSetupComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await db.collection("users").add(newUser);
      userId = docRef.id;
      userData = { id: docRef.id, ...newUser };
    }

    const token = await genToken(userId);

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Remove geminiApiKey from response
    const { geminiApiKey, ...safeUser } = userData;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res
      .status(500)
      .json({ message: "Authentication failed. Please try again." });
  }
};

export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? "none" : "lax",
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ message: "Logout failed" });
  }
};