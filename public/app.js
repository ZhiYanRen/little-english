import { units, typeNames } from "./catalog.js";
import { officialResources } from "./official-resources.js";
import {
  STORAGE_KEY,
  MAX_IMPORT_BYTES,
  emptyState,
  validState,
  parseImport,
  mergeState,
  grade,
  normalize,
} from "./model.js";
import { listAudio, getAudio, saveAudio, validateAudioFiles } from "./audio.js";

const $ = (s) => document.querySelector(s);
$(".skip").onclick = (event) => {
  event.preventDefault();
  $("#main").focus();
  $("#main").scrollIntoView({ block: "start" });
};
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm16 0h-4a3 3 0 0 0-3 3m0 14a4 4 0 0 1 4-2h3V4",
  words: "M4 5h16v14H4zM7 15l3-7 3 7m-5-2h4m3-4h2m-1-1v7",
  chat: "M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5",
  audio: "M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4zm13 0h3v8h-3z",
  review: "m9 5 3-3 3 3M12 3v9M5 8a8 8 0 1 0 14 0",
  chart: "M4 20h16M7 16v-5m5 5V5m5 11V8",
  folder: "M3 6h7l2 2h9v12H3z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  play: "m9 5 10 7-10 7V5Z",
  plus: "M12 5v14M5 12h14",
  check: "m5 12 4 4 10-10",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  school: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01",
  kite: "m12 3 7 7-7 7-7-7 7-7Zm0 14c6 4-5 3 0 6M5 10h14M12 3v14",
  home: "m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7",
  people:
    "M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 21v-4a6 6 0 0 1 12 0v4m1-8a5 5 0 0 1 7 5v3",
  bowl: "M3 11h18a9 9 0 0 1-18 0Zm4 10h10M9 3v4m6-4v4",
  leaf: "M4 20C0 5 12 3 21 3c1 9-2 20-13 16m-4 1L17 7",
  town: "M3 21V8h7v13M10 21V3h7v18m0-10h4v10M6 12h1m-1 4h1m6-9h1m-1 4h1m-1 4h1",
  shirt: "m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z",
  ball: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM7 4c5 4 9 8 13 13M4 7c4 5 8 9 13 13M6 19 19 6",
  cake: "M4 11h16v10H4V11Zm-1 4c3 5 4-3 7 0s4-3 7 0 4 0 4 0M7 7v4m5-4v4m5-4v4M7 3v1m5-1v1m5-1v1",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
const btn = (action, label, style = "secondary", extra = "") =>
  `<button ${extra.includes("type=") ? "" : 'type="button"'} class="button ${style}" data-action="${action}" ${extra}>${label}</button>`;
const sourceLink = (u, label = "打开官方资源") =>
  `<a class="button secondary" href="${u.source}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
let state = emptyState(),
  storageOK = true,
  storageProblem = "",
  audioNames = [],
  route,
  dialogTrigger = null,
  toastTimer;
const sessions = new Map();
function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? validState(JSON.parse(saved)) : emptyState();
  } catch {
    storageOK = false;
    storageProblem =
      "本机记录暂时无法读取。为保护原记录，本次学习仅保存在当前页面；请先导出备份，并检查浏览器存储权限。";
    return state;
  }
}
state = load();
function showStorage() {
  const el = $("#storage-warning");
  el.hidden = storageOK;
  if (!storageOK) el.textContent = storageProblem;
}
function commit(change) {
  if (storageOK) state = load();
  state = change(state);
  if (storageOK)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      storageOK = false;
      storageProblem =
        "本机保存失败，可能是存储空间不足或权限受限。本次操作仍可使用，请导出文字和进度备份；音频请保留原文件。";
    }
  showStorage();
}
function announce(message) {
  clearTimeout(toastTimer);
  $("#status").textContent = message;
  $("#status").classList.add("visible");
  toastTimer = setTimeout(() => $("#status").classList.remove("visible"), 5000);
}
function unitEntries(n) {
  return state.entries.filter((e) => e.unit === n);
}
function progressFor(id) {
  return (
    state.progress[id] || {
      mastered: false,
      attempts: 0,
      correct: 0,
      wrong: false,
    }
  );
}
function countText(entries) {
  return entries.filter((e) => e.type !== "audio").length;
}
function getRoute() {
  const p = location.hash.replace(/^#\/?/, "").split("/");
  if (
    p[0] === "unit" &&
    /^([1-9]|1[0-2])$/.test(p[1]) &&
    ["resources", "words", "sentences", "audio"].includes(p[2])
  )
    return { view: "unit", unit: Number(p[1]), tab: p[2] };
  if (["review", "materials", "progress"].includes(p[0]))
    return { view: p[0], unit: state.recentUnit };
  return { view: "book", unit: state.recentUnit };
}
function nav() {
  const u = route.unit || state.recentUnit;
  const rows = [
    ["book", "book", "我的课本", "#/book"],
    ["words", "words", "单词短语", `#/unit/${u}/words`],
    ["sentences", "chat", "句子跟读", `#/unit/${u}/sentences`],
    ["audio", "audio", "听力练习", `#/unit/${u}/audio`],
    ["review", "review", "复习本", "#/review"],
    ["progress", "chart", "学习进度", "#/progress"],
  ];
  $("#navigation").innerHTML = rows
    .map(
      ([id, ic, label, href]) =>
        `<a href="${href}" class="nav-link ${route.view === id || route.tab === id ? "active" : ""}" ${route.view === id || route.tab === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${id === "review" && Object.values(state.progress).some((p) => p.wrong) ? '<i class="dot" aria-label="有待复习词句"></i>' : ""}</a>`,
    )
    .join("");
  $("#crumb").textContent =
    route.view === "unit"
      ? `Unit ${u} · ${units[u - 1].zh}`
      : {
          book: "我的课本",
          materials: "学习资料",
          review: "复习本",
          progress: "学习进度",
        }[route.view];
}
function heading(kicker, title, description, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}
function notice(text, kind = "info") {
  return `<div class="notice ${kind}">${icon(kind === "success" ? "check" : "book")}<div>${text}</div></div>`;
}
function empty(title, description, action = true) {
  return `<div class="empty">${icon("folder")}<h2>${title}</h2><p>${description}</p>${action ? '<a class="button primary" href="#/materials">导入学习资料 ' + icon("arrow") + "</a>" : ""}</div>`;
}
function firstUnitTab(n) {
  return unitEntries(n).some((e) => e.type !== "audio") ? "words" : "resources";
}
function bookView() {
  const total = countText(state.entries),
    mastered = state.entries.filter(
      (e) => e.type !== "audio" && progressFor(e.id).mastered,
    ).length;
  return (
    heading(
      "MY BOOKS / 我的图书",
      "我的英语课本",
      "从熟悉的课本，开始今天的学习。",
      `<a class="button secondary" href="#/progress">${icon("chart")}学习进度</a>`,
    ) +
    `<section class="book-banner"><div class="book-cover" aria-hidden="true"><span class="book-edition">SECOND EDITION</span><div class="book-name">Kid’s<br>Box<span>2</span></div><div class="book-stars">✦</div><div class="cover-line"></div><span class="cover-bottom">ENGLISH ADVENTURES</span></div><div class="book-info"><span class="pill">剑桥国际少儿英语</span><h2>第二版 <span>·</span> 第 2 级</h2><p>熟悉的 12 个单元，自己的学习节奏。</p><div class="book-numbers"><div><strong>12</strong><span>教材单元</span></div><div><strong>${total}</strong><span>已导入词句</span></div><div><strong>${mastered}</strong><span>已掌握词句</span></div></div><a class="text-link" href="#/unit/${state.recentUnit}/${firstUnitTab(state.recentUnit)}">进入 Unit ${state.recentUnit} ${icon("arrow")}</a></div><div class="book-sticker" aria-hidden="true">${icon("spark")}<span>Little steps,<br>big discoveries.</span></div></section><div class="section-heading"><h2>选择学习单元</h2><a href="https://kb.unischool.cn/" target="_blank" rel="noopener noreferrer">官方配套资源 ↗</a></div><div class="unit-grid">${units
      .map((u) => {
        const entries = unitEntries(u.id),
          total = countText(entries),
          done = entries.filter(
            (e) => e.type !== "audio" && progressFor(e.id).mastered,
          ).length;
        return `<a class="unit-card ${u.color}" href="#/unit/${u.id}/${firstUnitTab(u.id)}"><div class="unit-top"><span class="unit-number">${String(u.id).padStart(2, "0")}</span>${icon(u.icon, "unit-illustration")}<span class="unit-arrow">↗</span></div><h3 lang="en">${esc(u.title)}</h3><p>${u.zh}<span> · ${u.theme}</span></p><div class="unit-meta"><span>${total ? `${total} 个词句 · 已掌握 ${done}` : `${officialResources.units[u.id - 1].videos.length} 项官方视频 · ${officialResources.units[u.id - 1].audio.length} 条音轨`}</span><span>UNIT ${String(u.id).padStart(2, "0")}</span></div></a>`;
      })
      .join(
        "",
      )}</div><div class="catalog-note">${icon("check")}已核对12单元、56项视频与172条音轨的官方目录。播放按出版社要求登录激活。<a href="#/materials">了解如何导入 →</a></div>`
  );
}
function unitShell(u) {
  return (
    heading(
      `KID’S BOX 2 / UNIT ${String(u.id).padStart(2, "0")}`,
      `<span lang="en">${u.title}</span>`,
      `<span class="unit-subtitle">${u.zh}</span> ${u.summary}`,
      sourceLink(u),
    ) +
    `<div class="unit-nav"><a href="#/book" class="back-link">← 全部单元</a><div class="tabs" aria-label="本单元学习模块">${[
      ["resources", "book", "官方资源"],
      ["words", "words", "单词短语"],
      ["sentences", "chat", "句子跟读"],
      ["audio", "audio", "听力练习"],
    ]
      .map(
        ([tab, ic, label]) =>
          `<a href="#/unit/${u.id}/${tab}" class="${route.tab === tab ? "selected" : ""}" ${route.tab === tab ? 'aria-current="page"' : ""}>${icon(ic)}${label}</a>`,
      )
      .join("")}</div></div>`
  );
}
function session() {
  const key = route.view === "review" ? "review" : `${route.unit}/${route.tab}`;
  if (!sessions.has(key))
    sessions.set(key, {
      id: null,
      query: "",
      mode: "read",
      answer: "",
      submitted: false,
      result: null,
      revealed: false,
    });
  return sessions.get(key);
}
function studyEntries() {
  if (route.view === "review")
    return state.entries.filter(
      (e) => e.type !== "audio" && progressFor(e.id).wrong,
    );
  return unitEntries(route.unit).filter((e) =>
    route.tab === "words"
      ? ["word", "phrase"].includes(e.type)
      : e.type === "sentence",
  );
}
function filteredEntries() {
  const s = session(),
    q = normalize(s.query);
  return studyEntries().filter(
    (e) => !q || normalize(e.en).includes(q) || e.zh.includes(s.query.trim()),
  );
}
function activeEntry() {
  const all = studyEntries(),
    s = session();
  return all.find((e) => e.id === s.id) || all[0];
}
function listMarkup() {
  const entries = filteredEntries(),
    current = activeEntry();
  return entries.length
    ? entries
        .map(
          (e, i) =>
            `<button class="entry-row ${e.id === current?.id ? "selected" : ""}" data-action="select-entry" data-id="${esc(e.id)}" ${e.id === current?.id ? 'aria-current="true"' : ""}><span class="entry-index">${String(i + 1).padStart(2, "0")}</span><span class="entry-label"><strong lang="en">${esc(e.en)}</strong><small>${esc(e.zh || typeNames[e.type])}</small></span>${progressFor(e.id).mastered ? icon("check") : icon("arrow")}</button>`,
        )
        .join("")
    : `<div class="list-empty"><p>没有找到匹配词句</p>${btn("clear-search", "清除搜索", "ghost")}</div>`;
}
function searchMarkup() {
  const s = session();
  return `<div class="search-wrap"><label class="sr-only" for="entry-search">搜索本页词句</label><input id="entry-search" type="search" placeholder="搜索英文或中文" value="${esc(s.query)}" autocomplete="off"><button class="clear-search" data-action="clear-search" aria-label="清除搜索" ${!s.query ? "hidden" : ""}>×</button></div>`;
}
function studyCard() {
  const e = activeEntry();
  if (!e) return "";
  const s = session(),
    p = progressFor(e.id),
    spelling = s.mode === "spell",
    all = studyEntries(),
    index = all.findIndex((x) => x.id === e.id);
  return `<div class="study-card"><div class="study-top"><span class="pill">${typeNames[e.type]} · Unit ${e.unit}</span><span>${index + 1} / ${all.length}</span></div><div class="mode-switch" aria-label="学习方式">${btn("mode-read", "认读跟读", !spelling ? "selected" : "ghost", `aria-pressed="${!spelling}"`)}${btn("mode-spell", "听写练习", spelling ? "selected" : "ghost", `aria-pressed="${spelling}"`)}</div><div class="study-word"><span class="word-orbit" aria-hidden="true">${icon(e.type === "sentence" ? "chat" : "words")}</span><div class="study-en" lang="en">${spelling && !s.submitted ? "听一听，再写下来" : esc(e.en)}</div><p class="study-zh" tabindex="-1">${spelling || s.revealed || e.type === "sentence" ? esc(e.zh || "此词句未添加中文释义") : btn("reveal", "查看中文释义", "ghost")}</p></div><div class="listen-actions">${e.audio ? btn("play-entry", icon("play") + "播放导入录音", "primary") : ""}${btn("speak", icon("audio") + "系统朗读", e.audio ? "secondary" : "primary")}</div><p class="speech-note">${e.audio ? `录音：${esc(e.audio)}${audioNames.includes(e.audio) ? "" : " · 尚未导入同名文件"}` : "系统朗读使用设备英语语音，不是教材原版录音。"}</p>${spelling ? `<form id="answer-form" novalidate><label for="answer">输入听到的英文${e.type === "sentence" ? "句子" : ""}</label><div class="answer-row"><input id="answer" value="${esc(s.answer)}" lang="en" autocapitalize="none" autocomplete="off" spellcheck="false" ${s.submitted ? "readonly" : ""} aria-describedby="answer-feedback" ${s.result === false ? 'aria-invalid="true"' : ""}>${btn("submit-answer", "检查答案", "primary", s.submitted ? "disabled" : 'type="submit"')}</div><div id="answer-feedback" class="answer-feedback ${s.result === true ? "success" : s.result === false ? "error" : ""}" aria-live="polite">${s.submitted ? (s.result ? "答对了！这次拼写很准确。" : `再记一次：${esc(e.en)}。已加入复习本。`) : "忽略大小写、连续空格与句末标点；请保留单词拼写。"}</div>${s.submitted ? btn("retry", "再练一次", "secondary") : ""}</form>` : `<div class="mastery-row">${btn("master", p.mastered ? icon("check") + "已掌握 · 标为还不熟" : icon("check") + "我记住了", p.mastered ? "secondary" : "primary", `aria-pressed="${p.mastered}"`)}${btn("edit", "编辑词句", "ghost")}</div>`}<div class="card-footer">${btn("previous", "← 上一个", "ghost", index === 0 ? "disabled" : "")}<span>${p.mastered ? "已掌握" : "学习中"}</span>${btn("next", "下一个 →", "ghost", index === all.length - 1 ? "disabled" : "")}</div></div>`;
}
function studyView() {
  const isReview = route.view === "review",
    all = studyEntries();
  let html = isReview
    ? heading(
        "REVIEW / 温故知新",
        "把还不熟的，再练一次",
        "听写中写错的词句会来到这里；答对后自动移出。",
      )
    : unitShell(units[route.unit - 1]);
  if (!all.length)
    return (
      html +
      empty(
        isReview ? "复习本里还没有错题" : "本模块还没有教材词句",
        isReview
          ? "开始单元听写，写错的词句会自动收集到这里。"
          : "导入或手动添加你课本中的原文，再开始认读、跟读和听写。",
        !isReview,
      ) +
      (isReview
        ? '<a class="button primary" href="#/book">去选一个单元</a>'
        : `<div class="empty-links">${sourceLink(units[route.unit - 1], "查看本单元官方资源")}${btn("add", "手动添加词句")}</div>`)
    );
  return (
    html +
    `<div class="workspace"><section class="word-browser" aria-label="词句列表"><div class="list-title"><h2>${isReview ? "待复习词句" : route.tab === "words" ? "本单元词句" : "本单元句子"}</h2><span>${all.length} 条</span></div>${searchMarkup()}<div id="entry-list" class="entry-list">${listMarkup()}</div>${!isReview ? btn("add", icon("plus") + "添加课本原文", "ghost") : ""}</section><section id="study-panel" class="study-panel" aria-label="当前词句学习">${studyCard()}</section></div>`
  );
}
function audioView() {
  const u = units[route.unit - 1],
    entries = unitEntries(u.id).filter((e) => e.audio);
  return (
    unitShell(u) +
    notice(
      "原版配套录音可前往官方资源页使用；导入本机录音后，可在这里调速、循环和分段播放。",
    ) +
    `<div class="section-heading"><h2>本单元录音 <span class="muted">${entries.length} 条</span></h2>${btn("import-audio", icon("plus") + "导入音频", "primary")}</div>` +
    (entries.length
      ? `<div class="audio-list">${entries.map((e) => `<div class="audio-row"><span class="audio-disc">${icon("audio")}</span><div><strong lang="en">${esc(e.en)}</strong><p>${esc(e.zh || e.audio)}<span> · ${audioNames.includes(e.audio) ? "本机录音已保存" : "请导入同名文件"}</span></p></div>${btn("play-audio", icon("play") + "播放", "secondary", `data-id="${esc(e.id)}"`)}${btn("edit-audio", "编辑", "ghost", `data-id="${esc(e.id)}"`)}</div>`).join("")}</div>`
      : empty(
          "让课本里的声音，来到这里",
          "选择你已有的配套音频文件，按当前单元存入本机。也可以通过词句的音频文件名，将录音与原文关联。",
          false,
        )) +
    `<div class="empty-links">${sourceLink(u, "打开官方音频资源")}${btn("add", "添加音轨或分段")}</div>`
  );
}
function officialFreeResources() {
  return `<section class="official-free"><div class="section-heading"><h2>没有本机文件？先用官方公开资料</h2><a href="${officialResources.publicSource}" target="_blank" rel="noopener noreferrer">来源：外研社免费资源 ↗</a></div><p class="muted small">以下链接由出版社公开提供。第1单元样张、样例音频与《同步练习与测试》配套资料各有不同范围，不等于学生用书12单元的完整课文或视频。</p><div class="official-free-grid">${officialResources.freeResources.map((r) => `<a class="official-free-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span class="pill">${r.format}</span><strong>${esc(r.title)} ↗</strong><span>${esc(r.note)}</span></a>`).join("")}</div></section>`;
}
function officialView() {
  const u = units[route.unit - 1],
    resource = officialResources.units[route.unit - 1];
  const link = (section, label) =>
    `<a class="button primary" href="${u.source}#${section}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  return (
    unitShell(u) +
    notice(
      "以下为外研社官方目录。课程播放需要在官网登录并激活资源；本应用不保存整册视频或课文。没有激活资料时，可先使用下方官方公开下载。",
    ) +
    `<div class="official-resource-grid"><section class="surface"><div class="section-heading"><h2>本单元视频 <span class="muted">${resource.videos.length} 项</span></h2><span class="pill">官网播放 · 需激活</span></div><div class="official-video-list">${resource.videos.map((title, i) => `<div class="official-video-row"><span class="unit-number">${String(i + 1).padStart(2, "0")}</span><div><strong lang="en">${esc(title.replace(/^KB2 Unit \d+ /, ""))}</strong><span>Unit ${u.id} · 官方视频条目</span></div>${icon("play")}</div>`).join("")}</div>${link("studentBookVideo", "在官网打开本单元视频")}</section><section class="surface"><div class="section-heading"><h2>本单元音频 <span class="muted">${resource.audio.length} 条</span></h2><span class="pill">官网播放 · 需激活</span></div><p class="small muted">官网合并列出学生用书与活动用书音轨。以下是音轨编号，尚未导入本机，也未逐轨验证播放。</p><div class="official-audio-list">${resource.audio.map((title) => `<span>${esc(title.replace(/^\d+ .*? (CD\d+ T\d+)$/, "$1"))}</span>`).join("")}</div>${link("studentBookAudio", "在官网打开本单元音频")}</section></div><section class="surface official-text-note"><h2>课文短句</h2><p>目前没有收录学生用书整册原句。下方提供的官方样张和配套听力文本可用于查看原文；同步练习文本不等同于学生用书完整课文。</p><a class="text-link" href="#/unit/${u.id}/sentences">查看本机句子跟读 ${icon("arrow")}</a></section>` +
    officialFreeResources() +
    `<p class="resource-checked">目录核对：${officialResources.checkedAt} · ${esc(officialResources.edition)}。目录条目不计入已导入词句或学习成绩。</p>`
  );
}
function materialsView() {
  return (
    heading(
      "MY MATERIALS / 我的学习资料",
      "把自己的教材，放进来",
      "文字、音频和学习记录只保存在当前浏览器。",
    ) +
    officialFreeResources() +
    `<div class="material-grid"><section class="surface"><div class="section-icon">${icon("words")}</div><h2>教材文字</h2><p>添加课本中的单词、短语和句子；或从表格批量导入。</p><div class="material-count">${countText(state.entries)}<span> 个词句</span></div><div class="actions">${btn("add", "手动添加", "primary")}${btn("import-text", "导入 JSON / TSV")}${btn("paste", "粘贴表格文字", "ghost")}</div></section><section class="surface"><div class="section-icon purple-text">${icon("audio")}</div><h2>配套音频</h2><p>保存本机录音，按文件名关联词句，支持循环、调速与分段。</p><div class="material-count">${audioNames.length}<span> 个本机录音</span></div><label class="inline-field">导入到 <select id="audio-unit">${units.map((u) => `<option value="${u.id}" ${u.id === state.recentUnit ? "selected" : ""}>Unit ${u.id} · ${u.zh}</option>`).join("")}</select></label><div class="actions">${btn("import-audio", "选择音频文件", "primary")}</div></section></div><section class="surface backup-surface"><div><h2>给学习留一份备份</h2><p>导出教材文字与学习进度。换设备时导入 JSON 备份，再重新选择原始音频文件。</p><p class="muted small">备份不含音频。清理浏览器数据会移除本机资料，请保留备份与原始录音。</p></div>${btn("export", icon("folder") + "导出文字与进度", "secondary")}</section><section class="surface import-help"><h2>怎样准备导入文件？</h2><p>用表格软件整理后，另存为 UTF-8 TSV（制表符分隔），或复制到“粘贴表格文字”。表头须包含以下字段：</p><div class="table-scroll"><table><thead><tr><th>unit</th><th>type</th><th>en</th><th>zh</th><th>audio（可选）</th><th>start / end（可选）</th></tr></thead><tbody><tr><td>1—12</td><td>word / phrase / sentence / audio</td><td>英文原文或音轨名</td><td>中文释义</td><td>本机音频文件名</td><td>开始 / 结束秒数</td></tr></tbody></table></div><p>每行一条；audio 类型用于整段录音，需填写文件名。词句的英文、单元和类型相同时视为重复，导入时保留已有中文与音频设置。需要修改时，在学习卡片中选择“编辑词句”。</p><div class="actions">${btn("template", "下载空白 TSV 模板", "secondary")}<a class="text-link" href="https://kb.unischool.cn/" target="_blank" rel="noopener noreferrer">前往出版社配套资源 ↗</a></div></section>`
  );
}
function progressView() {
  const text = state.entries.filter((e) => e.type !== "audio"),
    mastered = text.filter((e) => progressFor(e.id).mastered).length,
    attempts = Object.values(state.progress).reduce(
      (a, p) => a + p.attempts,
      0,
    ),
    correct = Object.values(state.progress).reduce((a, p) => a + p.correct, 0);
  return (
    heading(
      "MY PROGRESS / 每一步都算数",
      "看见自己的进步",
      "掌握状态由你标记；听写记录来自实际作答。",
      btn("export", "导出学习备份"),
    ) +
    `<div class="stat-grid"><div class="surface"><span>已掌握词句</span><strong>${mastered}<small> / ${text.length}</small></strong></div><div class="surface"><span>累计听写</span><strong>${attempts}<small> 次</small></strong></div><div class="surface"><span>听写正确率</span><strong>${attempts ? Math.round((correct / attempts) * 100) + "%" : "—"}</strong></div></div><section class="surface"><div class="section-heading"><h2>单元学习足迹</h2><span>已掌握 / 已导入词句</span></div><div class="progress-list">${units
      .map((u) => {
        const entries = unitEntries(u.id).filter((e) => e.type !== "audio"),
          n = entries.filter((e) => progressFor(e.id).mastered).length;
        return `<a href="#/unit/${u.id}/words" class="progress-row"><span class="progress-number">${String(u.id).padStart(2, "0")}</span><div><strong lang="en">${u.title}</strong><div class="progress-track" role="progressbar" aria-label="Unit ${u.id} 掌握进度" aria-valuemin="0" aria-valuemax="${entries.length || 1}" aria-valuenow="${n}"><span style="transform:scaleX(${entries.length ? n / entries.length : 0})"></span></div></div><span>${entries.length ? `${n} / ${entries.length}` : "待导入"}</span>${icon("arrow")}</a>`;
      })
      .join("")}</div></section>`
  );
}
function render(focus = false) {
  route = getRoute();
  document.title = `英语小星球 · ${route.view === "unit" ? "Unit " + route.unit : { book: "我的课本", materials: "学习资料", review: "复习本", progress: "学习进度" }[route.view]}`;
  nav();
  $("#main").innerHTML =
    route.view === "book"
      ? bookView()
      : route.view === "materials"
        ? materialsView()
        : route.view === "progress"
          ? progressView()
          : route.view === "unit" && route.tab === "resources"
            ? officialView()
            : route.view === "unit" && route.tab === "audio"
              ? audioView()
              : studyView();
  showStorage();
  if (focus) $("h1")?.focus({ preventScroll: true });
}
function redrawCard() {
  const focused = document.activeElement,
    action = focused?.dataset.action,
    id = focused?.dataset.id;
  const panel = $("#study-panel");
  if (panel) panel.innerHTML = studyCard();
  const list = $("#entry-list");
  if (list) list.innerHTML = listMarkup();
  let target;
  if (action === "select-entry")
    target = [...document.querySelectorAll("[data-action=select-entry]")].find(
      (b) => b.dataset.id === id,
    );
  else if (action === "reveal") target = $(".study-zh");
  else if (action === "submit-answer") target = $("[data-action=retry]");
  else if (action)
    target = [...document.querySelectorAll("[data-action]")].find(
      (b) => b.dataset.action === action && !b.disabled,
    );
  if (!target && action)
    target =
      $("[data-action=previous]:not(:disabled)") ||
      $("[data-action=next]:not(:disabled)") ||
      $("#answer");
  target?.focus({ preventScroll: true });
}
function setEntry(id) {
  const s = session();
  s.id = id;
  s.answer = "";
  s.submitted = false;
  s.result = null;
  s.revealed = false;
  stopPlayback();
  redrawCard();
}
function openDialog(title, html) {
  if (!$("#dialog").open) dialogTrigger = document.activeElement;
  $("#dialog-title").textContent = title;
  $("#dialog-body").innerHTML = html;
  if (!$("#dialog").open) $("#dialog").showModal();
  requestAnimationFrame(() =>
    $("#dialog-body")
      .querySelector("input:not([readonly]),select,textarea,button")
      ?.focus(),
  );
}
function closeDialog() {
  if (audioSaving) return;
  if ($("#dialog").open) $("#dialog").close();
}
$("#close-dialog").onclick = closeDialog;
$("#close-dialog").disabled = false;
$("#dialog").addEventListener("close", () => {
  if ($("#dialog").open) return;
  pendingImport = null;
  pendingAudio = null;
  // A delayed close event must not steal focus from a newer user action.
  const current = document.activeElement;
  if (current && current !== document.body && !$("#dialog").contains(current))
    return;
  if (dialogTrigger?.isConnected) dialogTrigger.focus();
  else {
    const action = dialogTrigger?.dataset.action;
    const replacement = action
      ? [...document.querySelectorAll("[data-action]")].find(
          (b) => b.dataset.action === action,
        )
      : null;
    (replacement || $("h1"))?.focus({ preventScroll: true });
  }
});
function editor(entry = null) {
  const n = entry?.unit || route.unit || state.recentUnit;
  openDialog(
    entry ? "编辑词句" : "添加课本原文",
    `<form id="editor-form" novalidate data-edit="${esc(entry?.id || "")}"><div class="form-grid"><label>教材单元<select name="unit" ${entry ? "disabled" : ""}>${units.map((u) => `<option value="${u.id}" ${u.id === n ? "selected" : ""}>Unit ${u.id} · ${u.zh}</option>`).join("")}</select></label><label>内容类型<select name="type" ${entry ? "disabled" : ""}>${Object.entries(
      typeNames,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${key === (entry?.type || (route.tab === "sentences" ? "sentence" : "word")) ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label></div><label for="entry-en">英文原文 / 音轨名称</label><textarea id="entry-en" name="en" lang="en" rows="3" maxlength="1200" ${entry ? "readonly" : ""}>${esc(entry?.en || "")}</textarea>${entry ? '<p class="small muted">英文内容作为学习记录标识；要修正英文，请另行添加正确词句。</p>' : ""}<label for="entry-zh">中文释义（选填）</label><textarea id="entry-zh" name="zh" rows="2" maxlength="2000">${esc(entry?.zh || "")}</textarea><label for="entry-audio">关联音频文件名（选填）</label><input id="entry-audio" name="audio" value="${esc(entry?.audio || "")}" list="saved-audio" placeholder="与导入文件名完全相同，如 CD1 T2.mp3"><datalist id="saved-audio">${audioNames.map((x) => `<option value="${esc(x)}"></option>`).join("")}</datalist><div class="form-grid"><label>开始秒数<input name="start" type="number" min="0" step="0.1" value="${entry?.start || 0}"></label><label>结束秒数（选填）<input name="end" type="number" min="0" step="0.1" value="${entry?.end ?? ""}" placeholder="留空播放到结尾"></label></div><p id="editor-error" class="field-error" role="status"></p><div class="dialog-actions">${btn("cancel", "取消", "secondary")}${btn("save-entry", "保存到本机", "primary", 'type="submit"')}</div></form>`,
  );
}
let pendingImport = null,
  pendingAudio = null,
  audioSaving = false;
$("#dialog").addEventListener("cancel", (event) => {
  if (audioSaving) event.preventDefault();
});
function previewImport(incoming) {
  pendingImport = incoming;
  const fresh = incoming.entries.filter(
    (e) => !state.entries.some((x) => x.id === e.id),
  ).length;
  openDialog(
    "确认导入学习资料",
    `<p>识别到 <strong>${incoming.entries.length}</strong> 条资料，预计新增 <strong>${fresh}</strong> 条。重复词句保留现有释义与音频设置；学习进度合并，不删除已有记录。</p><ul class="preview-list">${incoming.entries
      .slice(0, 8)
      .map(
        (e) =>
          `<li><span>Unit ${e.unit} · ${typeNames[e.type]}</span><strong lang="en">${esc(e.en)}</strong></li>`,
      )
      .join(
        "",
      )}</ul>${incoming.entries.length > 8 ? '<p class="small muted">其余资料将在确认后一起导入。</p>' : ""}<p id="import-error" class="field-error" role="status"></p><div class="dialog-actions">${btn("cancel", "取消")}${btn("confirm-import", "确认合并到本机", "primary")}</div>`,
  );
}
function importTextError(message) {
  openDialog(
    "资料未导入",
    `<div class="notice warning">${esc(message)}</div><p>已有资料没有改变。请修正文件后重新选择，或下载空白模板。</p><div class="dialog-actions">${btn("cancel", "返回")}${btn("template", "下载 TSV 模板")}</div>`,
  );
}
function download(name, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let mediaToken = 0,
  mediaURL = null,
  mediaEntry = null;
const player = $("#audio-player");
function stopPlayback() {
  mediaToken++;
  player.pause();
  player.removeAttribute("src");
  player.load();
  if (mediaURL) URL.revokeObjectURL(mediaURL);
  mediaURL = null;
  mediaEntry = null;
  $("#player-panel").hidden = true;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
async function playEntry(e) {
  stopPlayback();
  const token = mediaToken;
  try {
    const blob = await getAudio(e.audio);
    if (token !== mediaToken) return;
    if (!blob) {
      announce(`找不到 ${e.audio}。请在“学习资料”导入同名音频。`);
      return;
    }
    mediaURL = URL.createObjectURL(blob);
    mediaEntry = e;
    $("#player-panel").hidden = false;
    $("#player-name").textContent = `Unit ${e.unit} · ${e.en}`;
    $("#player-error").textContent = "";
    $("#segment-label").textContent =
      e.start || e.end ? `${e.start} 秒 — ${e.end ?? "结尾"}` : "完整音轨";
    player.src = mediaURL;
    player.playbackRate = Number($("#speed").value);
    player.onloadedmetadata = async () => {
      if (token !== mediaToken) return;
      if (
        !Number.isFinite(player.duration) ||
        e.start >= player.duration ||
        (e.end !== null && e.end > player.duration + 0.1)
      ) {
        $("#player-error").textContent =
          "分段时间超出录音长度。请编辑开始与结束秒数后重试。";
        return;
      }
      player.currentTime = e.start;
      try {
        await player.play();
      } catch {
        if (token === mediaToken)
          $("#player-error").textContent =
            "请点播放器中的播放按钮；若仍无法播放，请检查文件格式。";
      }
    };
    player.onerror = () => {
      if (token === mediaToken)
        $("#player-error").textContent =
          "浏览器无法解码这份录音，请尝试 MP3 格式后重新导入。";
    };
  } catch (error) {
    if (token === mediaToken) announce(error.message);
  }
}
player.addEventListener("timeupdate", () => {
  if (mediaEntry?.end && player.currentTime >= mediaEntry.end) {
    if ($("#loop-audio").checked) player.currentTime = mediaEntry.start;
    else player.pause();
  }
});
player.addEventListener("play", () => {
  if (
    mediaEntry &&
    (player.currentTime < mediaEntry.start ||
      (mediaEntry.end && player.currentTime >= mediaEntry.end))
  )
    player.currentTime = mediaEntry.start;
});
player.addEventListener("ended", () => {
  if (mediaEntry && $("#loop-audio").checked) {
    player.currentTime = mediaEntry.start;
    player.play().catch(() => announce("循环播放暂停，请重新点击播放。"));
  }
});
$("#speed").onchange = () => {
  player.playbackRate = Number($("#speed").value);
};
$("#stop-player").onclick = stopPlayback;
$("#stop-player").disabled = false;
function speak(e) {
  stopPlayback();
  if (!("speechSynthesis" in window)) {
    announce("此浏览器不支持系统朗读。请使用官方资源，或导入本机录音。");
    return;
  }
  const voices = speechSynthesis.getVoices(),
    voice =
      voices.find((v) => v.lang === "en-GB") ||
      voices.find((v) => v.lang.startsWith("en"));
  if (voices.length && !voice) {
    announce("设备未安装英语语音。请在系统设置添加英语语音，或导入录音。");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(e.en),
    token = mediaToken;
  utterance.lang = "en-GB";
  if (voice) utterance.voice = voice;
  utterance.rate = Number($("#speed").value) * 0.85;
  utterance.onerror = (event) => {
    if (
      token === mediaToken &&
      !["canceled", "interrupted"].includes(event.error)
    )
      announce("系统朗读不可用。请检查设备英语语音，或导入本机录音。");
  };
  speechSynthesis.speak(utterance);
  announce("正在使用系统英语语音朗读。");
}
function markEntry() {
  const e = activeEntry();
  commit((s) => ({
    ...s,
    progress: {
      ...s.progress,
      [e.id]: {
        ...progressFor(e.id),
        mastered: !progressFor(e.id).mastered,
        updated: Date.now(),
      },
    },
  }));
  redrawCard();
  announce(progressFor(e.id).mastered ? "已标记为掌握。" : "已标记为还不熟。");
}
function submitAnswer() {
  const s = session(),
    e = activeEntry();
  if (s.submitted || !e) return;
  if (!s.answer.trim()) {
    $("#answer-feedback").textContent = "先写下你听到的英文，再检查答案。";
    $("#answer").setAttribute("aria-invalid", "true");
    $("#answer").focus();
    return;
  }
  commit((state) => grade(state, e.id, s.answer));
  s.result = normalize(s.answer) === normalize(e.en);
  s.submitted = true;
  redrawCard();
  if (route.view === "review" && s.result) {
    announce("答对了！已从复习本移出。");
    s.id = null;
    s.answer = "";
    s.submitted = false;
    s.result = null;
    render();
  } else $("#answer-feedback")?.scrollIntoView({ block: "nearest" });
}
function saveEditor(form) {
  const data = new FormData(form),
    id = form.dataset.edit,
    original = state.entries.find((e) => e.id === id);
  try {
    const incoming = parseImport(
      JSON.stringify({
        entries: [
          {
            unit: original?.unit || Number(data.get("unit")),
            type: original?.type || data.get("type"),
            en: data.get("en"),
            zh: data.get("zh"),
            audio: data.get("audio"),
            start: Number(data.get("start") || 0),
            end: data.get("end") ? Number(data.get("end")) : null,
          },
        ],
      }),
      "json",
    );
    const e = incoming.entries[0];
    commit((s) =>
      id
        ? { ...s, entries: s.entries.map((old) => (old.id === id ? e : old)) }
        : mergeState(s, incoming),
    );
    closeDialog();
    render();
    announce(id ? "词句设置已保存。" : "已添加到本机资料。");
  } catch (error) {
    $("#editor-error").textContent = error.message;
    const input = form.querySelector(
      !data.get("en") ? "[name=en]" : "[name=audio]",
    );
    input?.setAttribute("aria-invalid", "true");
    input?.setAttribute("aria-describedby", "editor-error");
    input?.focus();
  }
}
let audioUnit = 1;
async function pickAudio(files) {
  try {
    validateAudioFiles(files);
    const saved = await listAudio(),
      fresh = files.filter((f) => !saved.includes(f.name));
    pendingAudio = { files: fresh, all: files, unit: audioUnit };
    openDialog(
      "确认导入本机录音",
      `<p>将为 <strong>Unit ${audioUnit}</strong> 添加 ${files.length} 条录音记录，保存 ${fresh.length} 个新音频文件。同名已保存录音会跳过，不覆盖原文件。</p><ul class="preview-list">${files
        .slice(0, 8)
        .map(
          (f) =>
            `<li><strong>${esc(f.name)}</strong><span>${(f.size / 1024 / 1024).toFixed(2)} MB</span></li>`,
        )
        .join(
          "",
        )}</ul><p>录音仅保存在当前浏览器。请保留原始文件，以便备份和换设备。</p><p id="import-error" class="field-error" role="status"></p><div class="dialog-actions">${btn("cancel", "取消")}${btn("confirm-audio", "保存录音到本机", "primary")}</div>`,
    );
  } catch (error) {
    importTextError(error.message);
  }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  try {
    if (action === "cancel") closeDialog();
    else if (action === "add") editor();
    else if (action === "edit") editor(activeEntry());
    else if (action === "edit-audio")
      editor(state.entries.find((e) => e.id === button.dataset.id));
    else if (action === "import-text") $("#text-file").click();
    else if (action === "import-audio") {
      audioUnit = Number(
        $("#audio-unit")?.value || route.unit || state.recentUnit,
      );
      $("#audio-files").click();
    } else if (action === "paste")
      openDialog(
        "粘贴表格文字",
        `<form id="paste-form" novalidate><label for="paste-text">从表格复制包含表头的资料</label><textarea id="paste-text" rows="9" spellcheck="false" placeholder="unit&#9;type&#9;en&#9;zh"></textarea><p class="small muted">制表符分隔，必填表头 unit、type、en、zh。每行一个单词、短语或句子。</p><p id="paste-error" class="field-error" role="status"></p><div class="dialog-actions">${btn("cancel", "取消")}${btn("preview-paste", "预览导入", "primary", 'type="submit"')}</div></form>`,
      );
    else if (action === "confirm-import") {
      const incoming = pendingImport;
      if (!incoming) return;
      commit((s) => mergeState(s, incoming));
      closeDialog();
      render();
      announce("学习资料已合并。原有资料与进度已保留。");
    } else if (action === "confirm-audio") {
      const incoming = pendingAudio;
      if (!incoming) return;
      const audioData = parseImport(
        JSON.stringify({
          entries: incoming.all.map((f) => ({
            unit: incoming.unit,
            type: "audio",
            en: f.name,
            zh: units[incoming.unit - 1].zh,
            audio: f.name,
          })),
        }),
      );
      mergeState(state, audioData);
      audioSaving = true;
      button.disabled = true;
      button.textContent = "正在保存…";
      $("#dialog-body [data-action=cancel]").disabled = true;
      $("#close-dialog").disabled = true;
      try {
        await saveAudio(incoming.files);
        audioNames = await listAudio();
        commit((s) => mergeState(s, audioData));
        audioSaving = false;
        closeDialog();
        render();
        announce("录音已保存到本机，可前往对应单元播放。");
      } catch (error) {
        audioSaving = false;
        $("#dialog-body [data-action=cancel]").disabled = false;
        $("#import-error").textContent = error.message;
        button.disabled = false;
        button.textContent = "重新保存录音";
      } finally {
        $("#close-dialog").disabled = false;
      }
    } else if (action === "export") {
      download(
        "learning-backup-kb2.json",
        JSON.stringify(state, null, 2),
        "application/json",
      );
      announce("已导出文字与进度备份。音频请保留原始文件。");
    } else if (action === "template") {
      download(
        "kb2-materials-template.tsv",
        "unit\ttype\ten\tzh\taudio\tstart\tend\n",
        "text/tab-separated-values;charset=utf-8",
      );
      announce("空白模板已下载。");
    } else if (action === "select-entry") setEntry(button.dataset.id);
    else if (action === "clear-search") {
      session().query = "";
      $("#entry-search").value = "";
      $(".clear-search").hidden = true;
      $("#entry-list").innerHTML = listMarkup();
      $("#entry-search").focus();
    } else if (action === "mode-read" || action === "mode-spell") {
      session().mode = action === "mode-spell" ? "spell" : "read";
      redrawCard();
    } else if (action === "reveal") {
      session().revealed = true;
      redrawCard();
    } else if (action === "speak") speak(activeEntry());
    else if (action === "play-entry") await playEntry(activeEntry());
    else if (action === "play-audio")
      await playEntry(state.entries.find((e) => e.id === button.dataset.id));
    else if (action === "master") markEntry();
    else if (action === "retry") {
      session().answer = "";
      session().submitted = false;
      session().result = null;
      redrawCard();
      $("#answer")?.focus();
    } else if (action === "previous" || action === "next") {
      const all = studyEntries(),
        index = all.findIndex((e) => e.id === activeEntry()?.id);
      const next = all[index + (action === "next" ? 1 : -1)];
      if (next) setEntry(next.id);
    }
  } catch (error) {
    announce(error.message);
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "entry-search") {
    session().query = event.target.value;
    $(".clear-search").hidden = !event.target.value;
    $("#entry-list").innerHTML = listMarkup();
  }
  if (event.target.id === "answer") session().answer = event.target.value;
});
document.addEventListener("submit", (event) => {
  if (!["answer-form", "editor-form", "paste-form"].includes(event.target.id))
    return;
  event.preventDefault();
  if (event.isComposing) return;
  if (event.target.id === "answer-form") submitAnswer();
  else if (event.target.id === "editor-form") saveEditor(event.target);
  else
    try {
      const incoming = parseImport($("#paste-text").value, "tsv");
      previewImport(incoming);
    } catch (error) {
      $("#paste-error").textContent = error.message;
      $("#paste-text").setAttribute("aria-invalid", "true");
      $("#paste-text").setAttribute("aria-describedby", "paste-error");
      $("#paste-text").focus();
    }
});
let composing = false;
document.addEventListener("compositionstart", () => (composing = true));
document.addEventListener("compositionend", () => (composing = false));
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    (composing || event.isComposing) &&
    event.target.closest("form")
  )
    event.preventDefault();
});
$("#text-file").onchange = async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES)
      throw Error("文字文件请控制在 64 MB 以内。");
    const incoming = parseImport(
      await file.text(),
      file.name.toLowerCase().endsWith(".tsv") ? "tsv" : "json",
    );
    previewImport(incoming);
  } catch (error) {
    importTextError(error.message);
  }
};
$("#audio-files").onchange = async (event) => {
  const files = [...event.target.files];
  event.target.value = "";
  if (files.length) await pickAudio(files);
};
window.addEventListener("hashchange", () => {
  closeDialog();
  stopPlayback();
  const next = getRoute();
  if (next.view === "unit") commit((s) => ({ ...s, recentUnit: next.unit }));
  render(true);
  window.scrollTo({ top: 0 });
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    state = load();
    render();
    announce("本机另一个窗口的学习记录已更新。");
  }
});
window.addEventListener("pagehide", stopPlayback);
render();
listAudio()
  .then((names) => {
    audioNames = names;
    if (route.view === "materials" || route.tab === "audio") render();
  })
  .catch(() => {});
