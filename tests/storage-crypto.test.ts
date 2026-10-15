import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptReadingPayload, decryptReadingPayload } from "../src/lib/crypto/readings";
import { clearReadings, getReadings, saveReading, deleteReading, STORAGE_KEY } from "../src/lib/storage";
import { readingFixture } from "./fixtures";

test("encrypted historical snapshots round-trip and reject tampering or wrong keys", () => {
  const previous = process.env.READINGS_ENCRYPTION_KEY;
  process.env.READINGS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  try {
    const reading = readingFixture(); const encrypted = encryptReadingPayload(reading);
    assert.deepEqual(decryptReadingPayload(encrypted), reading);
    assert.notEqual(encryptReadingPayload(reading).iv, encrypted.iv);
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64"); ciphertext[0] ^= 1;
    assert.throws(() => decryptReadingPayload({ ...encrypted, ciphertext: ciphertext.toString("base64") }));
    process.env.READINGS_ENCRYPTION_KEY = randomBytes(32).toString("base64"); assert.throws(() => decryptReadingPayload(encrypted));
  } finally { if (previous === undefined) delete process.env.READINGS_ENCRYPTION_KEY; else process.env.READINGS_ENCRYPTION_KEY = previous; }
});

test("local storage tolerates malformed history, enforces retention and reports failed writes", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
  Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
  try {
    data.set(STORAGE_KEY, "{}"); assert.deepEqual(getReadings(), []);
    data.set(STORAGE_KEY, "broken-json"); assert.deepEqual(getReadings(), []);
    const reading = readingFixture();
    data.set(STORAGE_KEY, JSON.stringify([null, reading])); assert.equal(getReadings().length, 1);
    saveReading(reading); saveReading(reading); assert.equal(getReadings().length, 1);
    for (let index = 0; index < 55; index++) saveReading({ ...reading, readingId: `12345678-1234-4234-8234-${String(index).padStart(12, "0")}` });
    assert.equal(getReadings().length, 50);
    const id = getReadings()[0].readingId; deleteReading(id); assert.equal(getReadings().length, 49);
    data.set("tarot_card_skin_v1", "quqi"); clearReadings();
    assert.equal(getReadings().length, 0); assert.equal(data.get("tarot_card_skin_v1"), "quqi");
    storage.removeItem = () => { throw new Error("SecurityError"); };
    assert.throws(clearReadings, /清空失败/);
    storage.setItem = () => { throw new Error("QuotaExceeded"); };
    assert.throws(() => saveReading(reading), /空间/);
    Object.defineProperty(globalThis, "window", { value: { get localStorage() { throw new Error("SecurityError"); } }, configurable: true });
    assert.deepEqual(getReadings(), []); assert.throws(() => saveReading(reading), /本地存储/);
    assert.throws(clearReadings, /无法访问/);
  } finally { delete (globalThis as { window?: unknown }).window; }
});
