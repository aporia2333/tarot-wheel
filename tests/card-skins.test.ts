import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { cardSkins, normalizeCardSkin } from "../src/data/cardSkins";
import { tarotCards, getCardImageSrc, getCardBackSrc } from "../src/data/tarotCards";
import manifest from "../src/data/quqiSkin.json";

test("both skins cover the same 78 stable card IDs without changing card data", () => {
  assert.deepEqual(cardSkins.map((skin) => skin.id), ["original", "quqi"]);
  assert.deepEqual(Object.keys(manifest.cards).sort(), tarotCards.map((card) => card.id).sort());
  const snapshot = JSON.stringify(tarotCards);
  const paths = new Set<string>();
  for (const card of tarotCards) {
    assert.equal(getCardImageSrc(card), `/cards/${card.imageUrl}`);
    const quqi = getCardImageSrc(card, "quqi");
    assert.equal(quqi, `/cards/skins/quqi-v9/${card.imageUrl}`);
    assert(existsSync(`public${quqi}`));
    paths.add(quqi);
  }
  assert.equal(paths.size, 78);
  assert.equal(JSON.stringify(tarotCards), snapshot);
  assert.equal(getCardBackSrc(), "/cards/back.svg");
  assert.equal(getCardBackSrc(undefined, "quqi"), "/cards/skins/quqi-v9/back.jpg");
});

test("published Quqi deck includes all 79 approved assets with intact checksums", () => {
  const base = "public/cards/skins/quqi-v9";
  assert.deepEqual(JSON.parse(readFileSync(`${base}/manifest.json`, "utf8")), manifest);
  const hashes = JSON.parse(readFileSync(`${base}/checksums.json`, "utf8")) as Record<string, string>;
  assert.equal(Object.keys(hashes).length, 79);
  for (const [name, hash] of Object.entries(hashes)) {
    assert.equal(createHash("sha256").update(readFileSync(`${base}/${name}`)).digest("hex"), hash);
  }
});

test("unknown settings and unmapped legacy cards retain the original skin", () => {
  for (const value of [null, undefined, "", "invalid", {}, "original"]) assert.equal(normalizeCardSkin(value), "original");
  assert.equal(normalizeCardSkin("quqi"), "quqi");
  assert.equal(getCardImageSrc({ ...tarotCards[0], id: "unmapped" }, "quqi"), getCardImageSrc(tarotCards[0]));
});
