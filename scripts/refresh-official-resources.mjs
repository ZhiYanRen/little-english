import { writeFile } from "node:fs/promises";

// Read public catalogues only. Never follow protected article/media URLs or call activation APIs.
const checkedAt =
  process.argv[2] ||
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) throw Error("Expected YYYY-MM-DD");
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "")
    .trim();
const units = await Promise.all(
  Array.from({ length: 12 }, async (_, i) => {
    const unit = i + 1,
      source = `https://www.unischool.cn/kb/resource/kb2/book2/unit${unit}/`;
    const response = await fetch(source, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok || new URL(response.url).hostname !== "www.unischool.cn")
      throw Error(`Unit ${unit}: public catalogue unavailable`);
    const html = await response.text();
    const titles = (id) => {
      const section = html.match(
        new RegExp(`<div class="list-box" id="${id}">([\\s\\S]*?)</ul>`),
      )?.[1];
      if (!section) throw Error(`Unit ${unit}: missing ${id}`);
      return [
        ...section.matchAll(/<span class="title nowrap" title="([^"]+)"/g),
      ].map((m) => decode(m[1]));
    };
    const videos = titles("studentBookVideo"),
      audio = titles("studentBookAudio");
    if (
      !videos.length ||
      !audio.length ||
      videos.some((x) => !x.startsWith(`KB2 Unit ${unit} `))
    )
      throw Error(`Unit ${unit}: unexpected edition or catalogue structure`);
    return {
      unit,
      source,
      videos,
      audio,
      requiresActivation: html.includes("activation/checkActivationed"),
    };
  }),
);
const freeResources = [
  {
    id: "unit1-pages",
    title: "第 1 单元学生用书样张",
    format: "PDF",
    url: "https://cdn-web.unischool.cn/kb/mfzy/yzyyp/KB2XS2_U1_yz.pdf",
    note: "第二版第2级，仅第1单元样张，非整册课本。",
  },
  {
    id: "unit1-audio",
    title: "第 1 单元学生用书样例音频",
    format: "ZIP",
    url: "https://cdn-web.unischool.cn/kb/mfzy/yzyyp/KB2XS2_U1_yp.zip",
    note: "第二版第2级，第1单元样例音频；下载后需解压。",
  },
  {
    id: "practice-audio",
    title: "同步练习与测试配套音频",
    format: "RAR",
    url: "https://cdn-web.unischool.cn/kb/mfzy/tblxyp/KB2_worksheets_and_tests_audio.rar",
    note: "第2级同步练习与测试配套资源，非学生用书整册录音；下载后需解压。",
  },
  {
    id: "practice-text",
    title: "同步练习与测试答案、听力文本",
    format: "PDF",
    url: "https://cdn-web.unischool.cn/kb/mfzy/tblxda/KB2_key_and_tapescript.pdf",
    note: "第2级同步练习与测试资料，非学生用书整册课文。",
  },
];
const data = {
  version: 1,
  edition: "剑桥国际少儿英语 第二版 第2级",
  checkedAt,
  publisher: "外研社",
  publicSource: "https://kb.unischool.cn/",
  units,
  freeResources,
};
await writeFile(
  new URL("../public/official-resources.js", import.meta.url),
  "// Public official catalogue metadata and links only; no media or textbook transcripts.\nexport const officialResources = " +
    JSON.stringify(data, null, 2) +
    ";\n",
);
console.log(
  `Indexed ${units.length} units, ${units.reduce((n, u) => n + u.videos.length, 0)} video titles and ${units.reduce((n, u) => n + u.audio.length, 0)} audio titles; no media downloaded.`,
);
