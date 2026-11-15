// Covers the maximum validated 3000-entry backup, including UTF-8 text and progress IDs.
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
export const STORAGE_KEY = "little-english-kb2-v1";
const types = ["word", "phrase", "sentence", "audio"];
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function emptyState() {
  return { version: 1, entries: [], progress: {}, recentUnit: 1 };
}
export function normalize(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？]+$/u, "")
    .trim();
}
export function entryId(e) {
  return `u${e.unit}:${e.type}:${normalize(e.en)}`;
}
function fail(message) {
  throw new Error(message);
}
function text(v, name, max, required = false) {
  if (typeof v !== "string" || v.length > max || (required && !v.trim()))
    fail(`${name}须为${required ? "非空" : ""}文字，最多 ${max} 字。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF]/u.test(v))
    fail(`${name}包含不支持的控制字符。`);
  return v.trim();
}
function checkEntry(raw, index) {
  if (!object(raw)) fail(`第 ${index + 1} 条资料格式不正确。`);
  const unit = raw.unit;
  if (!Number.isInteger(unit) || unit < 1 || unit > 12)
    fail(`第 ${index + 1} 条：单元必须是 1—12。`);
  if (!types.includes(raw.type))
    fail(`第 ${index + 1} 条：类型须为 word、phrase、sentence 或 audio。`);
  const en = text(raw.en, "英文或音轨名称", 1200, true),
    zh = text(raw.zh ?? "", "中文", 2000),
    audio = text(raw.audio ?? "", "音频文件名", 200);
  if (
    audio &&
    (/[\\/:\u0000-\u001f]/u.test(audio) || audio === "." || audio === "..")
  )
    fail("音频请填写本机文件名，不接受网址或文件路径。");
  if (normalize(en).length > 1200) fail("规范化后的英文原文过长。");
  const start = raw.start ?? 0,
    end = raw.end ?? null;
  if (
    typeof start !== "number" ||
    !Number.isFinite(start) ||
    start < 0 ||
    start > 86400
  )
    fail("开始秒数须为 0—86400 的数字。");
  if (
    end !== null &&
    (typeof end !== "number" ||
      !Number.isFinite(end) ||
      end <= start ||
      end > 86400)
  )
    fail("结束秒数须大于开始秒数，且不超过 86400。");
  if (raw.type === "audio" && !audio) fail("音频条目需要填写录音文件名。");
  return {
    id: entryId({ unit, type: raw.type, en }),
    unit,
    type: raw.type,
    en,
    zh,
    audio,
    start,
    end,
  };
}
export function validState(raw) {
  if (
    !object(raw) ||
    raw.version !== 1 ||
    !Array.isArray(raw.entries) ||
    raw.entries.length > 3000
  )
    fail("资料须为 version: 1，最多包含 3000 条 entries。");
  const entries = [],
    ids = new Set();
  for (const [i, item] of raw.entries.entries()) {
    const e = checkEntry(item, i);
    if (!ids.has(e.id)) {
      ids.add(e.id);
      entries.push(e);
    }
  }
  const progress = {};
  if (raw.progress !== undefined) {
    if (!object(raw.progress)) fail("学习记录格式不正确。");
    for (const [key, p] of Object.entries(raw.progress)) {
      if (
        !ids.has(key) ||
        !object(p) ||
        typeof p.mastered !== "boolean" ||
        typeof p.wrong !== "boolean" ||
        !Number.isSafeInteger(p.attempts) ||
        p.attempts < 0 ||
        p.attempts > 1000000 ||
        !Number.isSafeInteger(p.correct) ||
        p.correct < 0 ||
        p.correct > p.attempts
      )
        fail("学习记录包含无效条目。");
      progress[key] = {
        mastered: p.mastered,
        wrong: p.wrong,
        attempts: p.attempts,
        correct: p.correct,
        updated:
          Number.isSafeInteger(p.updated) && p.updated >= 0 ? p.updated : 0,
      };
    }
  }
  const recentUnit =
    Number.isInteger(raw.recentUnit) &&
    raw.recentUnit >= 1 &&
    raw.recentUnit <= 12
      ? raw.recentUnit
      : 1;
  return { version: 1, entries, progress, recentUnit };
}
export function parseImport(source, format = "json") {
  if (typeof source !== "string" || source.length > MAX_IMPORT_BYTES)
    fail("文字资料请控制在 64 MB 以内。");
  if (format === "tsv") {
    const lines = source
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((x) => x.trim());
    if (!lines.length) fail("文件没有内容。");
    const headers = lines
      .shift()
      .split("\t")
      .map((x) => x.trim());
    if (
      !["unit", "type", "en", "zh"].every((x) => headers.includes(x)) ||
      new Set(headers).size !== headers.length ||
      headers.some(
        (x) =>
          !["unit", "type", "en", "zh", "audio", "start", "end"].includes(x),
      )
    )
      fail("表头须包含 unit、type、en、zh；可加 audio、start、end。");
    const entries = lines.map((line, index) => {
      const cells = line.split("\t");
      if (cells.length !== headers.length)
        fail(`第 ${index + 2} 行列数与表头不同。`);
      const row = Object.fromEntries(
        headers.map((k, i) => [k, cells[i].trim()]),
      );
      return {
        ...row,
        unit: Number(row.unit),
        start: row.start ? Number(row.start) : 0,
        end: row.end ? Number(row.end) : null,
      };
    });
    return validState({ version: 1, entries });
  }
  let raw;
  try {
    raw = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    fail("JSON 无法读取，请检查文件格式。");
  }
  if (Array.isArray(raw)) raw = { version: 1, entries: raw };
  if (object(raw) && raw.version === undefined) raw = { ...raw, version: 1 };
  return validState(raw);
}
export function mergeState(current, incoming) {
  const result = validState(current),
    next = validState(incoming),
    map = new Map(result.entries.map((e) => [e.id, e]));
  for (const e of next.entries) if (!map.has(e.id)) map.set(e.id, e);
  if (map.size > 3000) fail("合并后超过 3000 条，请分批整理资料。");
  result.entries = [...map.values()];
  for (const [id, p] of Object.entries(next.progress)) {
    const old = result.progress[id];
    result.progress[id] = old
      ? {
          mastered: old.mastered || p.mastered,
          attempts: Math.max(old.attempts, p.attempts),
          correct: Math.max(old.correct, p.correct),
          wrong: p.updated > old.updated ? p.wrong : old.wrong,
          updated: Math.max(old.updated, p.updated),
        }
      : p;
  }
  return result;
}
export function grade(state, id, answer) {
  const e = state.entries.find((x) => x.id === id);
  if (!e || e.type === "audio") fail("找不到可练习的词句。");
  const p = state.progress[id] ?? {
    mastered: false,
    attempts: 0,
    correct: 0,
    wrong: false,
  };
  const correct = normalize(answer) === normalize(e.en);
  return {
    ...state,
    progress: {
      ...state.progress,
      [id]: {
        ...p,
        attempts: Math.min(1000000, p.attempts + 1),
        correct: Math.min(1000000, p.correct + Number(correct)),
        wrong: !correct,
        updated: Date.now(),
      },
    },
  };
}
