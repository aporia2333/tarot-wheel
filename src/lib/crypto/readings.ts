import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

interface EncryptedPayload {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.READINGS_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("服务器未配置 READINGS_ENCRYPTION_KEY。");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("READINGS_ENCRYPTION_KEY 必须是 32 字节的 Base64 密钥。");
  }
  return key;
}

export function encryptReadingPayload(payload: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptReadingPayload<T>(payload: EncryptedPayload): T {
  if (payload?.version !== 1 || !payload.iv || !payload.tag || !payload.ciphertext) {
    throw new Error("历史记录的加密格式无效。");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
