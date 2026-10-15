import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tarotCards, getCardKnowledge, getKeywords, getCardMeaning, getCardBackSrc } from "../src/data/tarotCards";
import { spreads, toTarotSpread } from "../src/data/spreads";

test("78 unique cards, 22 ordered majors and four complete 14-card suits", () => {
  assert.equal(tarotCards.length, 78);
  for (const key of ["id", "nameEn", "nameCn", "cardNumber", "imageUrl"] as const) assert.equal(new Set(tarotCards.map((card) => card[key])).size, 78);
  const major = tarotCards.filter((card) => card.arcana === "Major Arcana");
  assert.deepEqual(major.map((card) => Number(card.number)), Array.from({ length: 22 }, (_, index) => index));
  assert(major.every((card) => card.suit === null && card.rank === "major"));
  assert.equal(major[8].nameEn, "Strength"); assert.equal(major[11].nameEn, "Justice");
  const rankNames = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
  const elements = { Wands: "Fire", Cups: "Water", Swords: "Air", Pentacles: "Earth" };
  for (const [suit, element] of Object.entries(elements)) {
    const cards = tarotCards.filter((card) => card.suit === suit);
    assert.equal(cards.length, 14);
    assert.deepEqual(cards.map((card) => Number(card.number)), Array.from({ length: 14 }, (_, index) => index + 1));
    cards.forEach((card, index) => {
      assert.equal(card.arcana, "Minor Arcana"); assert.equal(card.element, element);
      assert.equal(card.nameEn, `${rankNames[index]} of ${suit}`);
      assert.equal(card.imageUrl, `${suit[0].toLowerCase()}${String(index + 1).padStart(2, "0")}.jpg`);
      assert.equal(card.rank, index === 0 || index > 9 ? rankNames[index].toLowerCase() : String(index + 1));
    });
  }
});

test("all card references, orientations and image assets are complete", () => {
  const hashes = new Set<string>();
  for (const card of tarotCards) {
    for (const keywords of [card.uprightKeywords, card.reversedKeywords, card.uprightKeywordsCn, card.reversedKeywordsCn]) {
      assert(keywords?.length); assert(keywords.every((value) => typeof value === "string" && value.trim()));
      assert.equal(new Set(keywords).size, keywords.length);
    }
    assert(card.meaningsCn?.love && card.meaningsCn?.career && card.meanings?.love && card.meanings?.career);
    assert(card.reversedMeaningCn?.trim());
    assert.equal(card.astrologicalCorrespondence, card.zodiacSign);
    assert(existsSync(`public/cards/${card.imageUrl}`));
    assert(existsSync(`public${getCardBackSrc(card)}`));
    hashes.add(createHash("sha256").update(readFileSync(`public/cards/${card.imageUrl}`)).digest("hex"));
    assert.equal(getKeywords(card, "reversed"), card.reversedKeywordsCn);
    assert.equal(getCardMeaning(card, "reversed"), card.reversedMeaningCn);
  }
  assert.equal(hashes.size, 78);
  assert(readFileSync("tarot_cards_merged_zh.json").equals(readFileSync("src/data/tarot_cards_merged_zh.json")));
  assert.equal(getCardKnowledge({ id: "major-the-fool" }).nameCn, "愚者");
  assert.throws(() => getCardKnowledge({ id: "unknown" }));
});

test("all 16 spreads and every supported count have distinct positional context", () => {
  assert.equal(spreads.length, 16);
  assert.equal(new Set(spreads.map((spread) => spread.id)).size, 16);
  for (const definition of spreads) {
    assert(definition.countOptions.some((option) => option.value === definition.recommendedCount));
    for (const { value } of definition.countOptions) {
      const spread = toTarotSpread(definition, value);
      assert.equal(spread.positions.length, value); assert.equal(new Set(spread.positions).size, value);
      assert(spread.positions.every((position) => position.trim()));
      if (spread.id !== "custom") assert(spread.positions.every((position) => !/^第\s*\d+\s*张$/.test(position)));
    }
    assert.throws(() => toTarotSpread(definition, 78));
  }
  const yearly = spreads.find((spread) => spread.id === "yearly")!;
  assert.equal(toTarotSpread(yearly, 13).positions[0], "年度主题");
  assert.equal(toTarotSpread(yearly, 13).positions[12], "第 12 个月");
  assert.match(toTarotSpread(spreads.find((spread) => spread.id === "celtic-cross")!, 6).name, /简版/);
});
