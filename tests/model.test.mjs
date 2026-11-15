import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "../public/model.js";
import { units } from "../public/catalog.js";
const entry = {
  unit: 2,
  type: "word",
  en: "notebook",
  zh: "笔记本",
  audio: "lesson.mp3",
  start: 1,
  end: 3,
};
test("catalog has all twelve official units and no invented textbook entries", () => {
  assert.equal(units.length, 12);
  assert.equal(units[0].title, "Hello again!");
  assert.equal(units[11].title, "On holiday!");
  assert.equal(m.emptyState().entries.length, 0);
});
test("TSV imports words, phrases and sentences with timing and ignores blank lines", () => {
  const result = m.parseImport(
    "unit\ttype\ten\tzh\taudio\tstart\tend\n2\tword\tnotebook\t笔记本\tlesson.mp3\t1\t3\n\n2\tphrase\twrite neatly\t写工整\t\t\t",
    "tsv",
  );
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].end, 3);
  assert.equal(result.entries[1].start, 0);
});
test("invalid full import rejects before any records are changed", () => {
  for (const bad of [
    { ...entry, unit: 13 },
    { ...entry, type: "html" },
    { ...entry, start: 4, end: 2 },
    { ...entry, audio: "../x.mp3" },
    { ...entry, en: "" },
    { ...entry, zh: 44 },
  ])
    assert.throws(() =>
      m.parseImport(JSON.stringify({ entries: [entry, bad] }), "json"),
    );
  assert.throws(() => m.parseImport("{broken", "json"));
  assert.throws(() => m.parseImport("unit\ten\n2\tx", "tsv"));
});
test("merging is idempotent and keeps existing translations and learning progress", () => {
  const incoming = m.parseImport(
    JSON.stringify({ entries: [entry, entry] }),
    "json",
  );
  const a = m.mergeState(m.emptyState(), incoming);
  assert.equal(a.entries.length, 1);
  const id = a.entries[0].id;
  a.progress[id] = { mastered: true, attempts: 3, correct: 2, wrong: false };
  const b = m.mergeState(
    a,
    m.parseImport(
      JSON.stringify({ entries: [{ ...entry, zh: "new" }] }),
      "json",
    ),
  );
  assert.equal(b.entries.length, 1);
  assert.equal(b.entries[0].zh, "笔记本");
  assert.equal(b.progress[id].attempts, 3);
});
test("grading tolerates case, curly apostrophes and final punctuation but rejects misspelling", () => {
  let s = m.mergeState(
    m.emptyState(),
    m.parseImport(JSON.stringify({ entries: [entry] }), "json"),
  );
  const id = s.entries[0].id;
  s = m.grade(s, id, "note book");
  assert.equal(s.progress[id].wrong, true);
  s = m.grade(s, id, " NOTEBOOK. ");
  assert.equal(s.progress[id].wrong, false);
  assert.equal(s.progress[id].correct, 1);
  assert.equal(m.normalize(" It’s   blue! "), "it's blue");
  assert.throws(() => m.grade(s, "unknown", "x"));
});
test("backups validate every record, reject unsafe progress keys and merge without downgrading", () => {
  const state = m.mergeState(
    m.emptyState(),
    m.parseImport(JSON.stringify({ entries: [entry] }), "json"),
  );
  state.progress[state.entries[0].id] = {
    mastered: true,
    attempts: 3,
    correct: 2,
    wrong: false,
  };
  const restored = m.parseImport(JSON.stringify(state), "json");
  assert.equal(
    m.mergeState(m.emptyState(), restored).progress[state.entries[0].id]
      .mastered,
    true,
  );
  assert.throws(() =>
    m.parseImport(
      '{"version":1,"entries":[],"progress":{"__proto__":{}}}',
      "json",
    ),
  );
  assert.throws(() =>
    m.parseImport(
      JSON.stringify({
        ...state,
        progress: { [state.entries[0].id]: { mastered: "yes" } },
      }),
      "json",
    ),
  );
  assert.throws(() => m.validState({ version: 2, entries: [], progress: {} }));
});
test("audio-only lesson entries are supported with text kept private", () => {
  const parsed = m.parseImport(
    JSON.stringify({
      entries: [
        {
          unit: 1,
          type: "audio",
          en: "CD1 T2",
          zh: "第1单元录音",
          audio: "CD1 T2.mp3",
        },
      ],
    }),
    "json",
  );
  assert.equal(parsed.entries[0].type, "audio");
});
test("large valid material backups remain reimportable after adding IDs, defaults and formatting", () => {
  const entries = Array.from({ length: 651 }, (_, i) => ({
    ...entry,
    en: `word${i}`,
    zh: "中".repeat(1990),
  }));
  const incoming = m.parseImport(JSON.stringify({ entries }));
  const saved = m.mergeState(m.emptyState(), incoming),
    backup = JSON.stringify(saved, null, 2);
  assert.ok(Buffer.byteLength(backup) > 4000000);
  assert.ok(Buffer.byteLength(backup) <= m.MAX_IMPORT_BYTES);
  assert.equal(m.parseImport(backup).entries.length, 651);
});

test("official resource index covers all units without copying protected media or lesson text", async () => {
  const { officialResources } = await import("../public/official-resources.js");
  assert.equal(officialResources.units.length, 12);
  assert.ok(
    officialResources.units[2].videos.includes(
      "KB2 Unit 3 What's the time, Mr Wolf?",
    ),
  );
  assert.ok(
    officialResources.units[9].videos.includes(
      "KB2 Unit 10 Let's go climbing!",
    ),
  );
  assert.equal(
    officialResources.units.reduce((n, u) => n + u.videos.length, 0),
    56,
  );
  assert.equal(
    officialResources.units.reduce((n, u) => n + u.audio.length, 0),
    172,
  );
  for (const [i, u] of officialResources.units.entries()) {
    assert.equal(u.unit, i + 1);
    assert.equal(u.requiresActivation, true);
    assert.equal(
      u.source,
      `https://www.unischool.cn/kb/resource/kb2/book2/unit${i + 1}/`,
    );
    assert.ok(
      u.videos.every((title) => title.startsWith(`KB2 Unit ${i + 1} `)),
    );
    assert.ok(
      !JSON.stringify(u).match(/\.mp4|\.mp3|\/c\/|tapescript|transcript/i),
    );
  }
  assert.equal(officialResources.freeResources.length, 4);
  for (const resource of officialResources.freeResources) {
    assert.equal(new URL(resource.url).hostname, "cdn-web.unischool.cn");
    assert.ok(resource.note);
  }
});
