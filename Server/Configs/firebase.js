import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// In production: set FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
// In development: place serviceAccountKey.json in Server/ directory
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  // Fallback: use individual env vars
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "voice-agent-30a0b",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const db = admin.firestore();

// ── Helper: Convert Firestore doc → plain JS object with id ──
export const docToUser = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// Same but excludes geminiApiKey (for API responses)
export const docToUserSafe = (doc) => {
  const user = docToUser(doc);
  if (user) delete user.geminiApiKey;
  return user;
};

// Convert a plain object (already has id) and remove geminiApiKey
export const toSafeUser = (user) => {
  if (!user) return null;
  const { geminiApiKey, ...safe } = user;
  return safe;
};
