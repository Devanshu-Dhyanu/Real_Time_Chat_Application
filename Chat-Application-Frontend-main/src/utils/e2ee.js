const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const fromBase64 = (value) => {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const PRIVATE_KEY_PREFIX = "chat-private-key";

export const getPrivateKeyStorageKey = (userId) => `${PRIVATE_KEY_PREFIX}:${userId}`;

export const generateAndExportKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const [publicJwk, privateJwk] = await Promise.all([
    window.crypto.subtle.exportKey("jwk", keyPair.publicKey),
    window.crypto.subtle.exportKey("jwk", keyPair.privateKey),
  ]);

  return {
    publicKey: JSON.stringify(publicJwk),
    privateKey: JSON.stringify(privateJwk),
  };
};

export const importPublicKey = async (serializedKey) => {
  const jwk = JSON.parse(serializedKey);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"],
  );
};

export const importPrivateKey = async (serializedKey) => {
  const jwk = JSON.parse(serializedKey);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"],
  );
};

export const encryptMessageForParticipants = async (payload, recipients) => {
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const serializedPayload = JSON.stringify(payload);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    textEncoder.encode(serializedPayload),
  );

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeysEntries = await Promise.all(
    recipients.map(async ({ userId, publicKey }) => {
      const importedPublicKey = await importPublicKey(publicKey);
      const encryptedAesKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        importedPublicKey,
        rawAesKey,
      );

      return [String(userId), toBase64(new Uint8Array(encryptedAesKey))];
    }),
  );

  return {
    encryptedPayload: {
      algorithm: "AES-GCM",
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipherBuffer)),
    },
    encryptedKeys: Object.fromEntries(encryptedKeysEntries),
  };
};

export const decryptMessagePayload = async (message, privateKey, currentUserId) => {
  if (!message?.encryptedPayload || !message?.encryptedKeys || !privateKey) {
    return {
      ...message,
      content: message?.content || "",
    };
  }

  const encryptedKey = message.encryptedKeys[String(currentUserId)];
  if (!encryptedKey) {
    return {
      ...message,
      content: "[Encrypted message unavailable]",
      mediaUrl: "",
      fileName: "",
      mimeType: "",
    };
  }

  const decryptedAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(encryptedKey),
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    decryptedAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const clearBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(message.encryptedPayload.iv),
    },
    aesKey,
    fromBase64(message.encryptedPayload.ciphertext),
  );

  const decoded = JSON.parse(textDecoder.decode(clearBuffer));
  return {
    ...message,
    content: decoded.content || "",
    mediaUrl: decoded.mediaUrl || "",
    fileName: decoded.fileName || "",
    mimeType: decoded.mimeType || "",
    type: decoded.type || message.type || "text",
    decrypted: true,
  };
};

export const getConversationPreview = (message) => {
  if (!message) return "";
  if (message.type === "image") return "Photo";
  if (message.type === "file") return message.fileName || "Attachment";
  return message.content || "Encrypted message";
};
