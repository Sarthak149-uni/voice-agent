import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex string: iv + authTag + ciphertext.
 */
export const encrypt = (text) => {
  const key = process.env.GEMINI_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "GEMINI_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }

  const keyBuffer = Buffer.from(key, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // iv (32 hex) + authTag (32 hex) + ciphertext
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
};

/**
 * Decrypt a hex string produced by encrypt().
 */
export const decrypt = (encryptedHex) => {
  const key = process.env.GEMINI_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "GEMINI_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }

  const keyBuffer = Buffer.from(key, "hex");

  const iv = Buffer.from(encryptedHex.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedHex.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2),
    "hex"
  );
  const ciphertext = encryptedHex.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
