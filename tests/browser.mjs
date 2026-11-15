import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:4182/little-english/";
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
  headless: true,
});
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1194, height: 834 },
  hasTouch: true,
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const click = async (action) =>
  page.locator(`[data-action="${action}"]`).first().click();
const jump = async (hash) => {
  await page.goto(base + hash);
  if (hash.startsWith("#/unit/"))
    await page
      .locator(`.tabs a[aria-current="page"][href="${hash}"]`)
      .waitFor();
  else {
    const titles = {
      "#/book": "我的英语课本",
      "#/materials": "把自己的教材，放进来",
      "#/progress": "看见自己的进步",
      "#/review": "把还不熟的，再练一次",
    };
    await page
      .getByRole("heading", { name: titles[hash], exact: true })
      .waitFor();
  }
};
const fixture =
  "unit\ttype\ten\tzh\taudio\tstart\tend\n2\tword\tnotebook\t笔记本\t\t\t\n2\tphrase\twrite neatly\t写工整\t\t\t\n2\tsentence\tThis is a test sentence.\t这是一句测试文字。\tlesson.wav\t0.25\t1.5\n";
const upload = async (text, name = "materials.tsv") => {
  await page.locator("#text-file").setInputFiles({
    name,
    mimeType: name.endsWith(".tsv")
      ? "text/tab-separated-values"
      : "application/json",
    buffer: Buffer.from(text),
  });
};
const wav = () => {
  const length = 2 * 8000 * 2,
    b = Buffer.alloc(44 + length);
  b.write("RIFF");
  b.writeUInt32LE(36 + length, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(length, 40);
  return b;
};
try {
  await page.goto(base);
  await page.getByRole("heading", { name: "我的英语课本" }).waitFor();
  assert.equal(await page.locator(".unit-card").count(), 12);
  assert.match(await page.locator(".book-numbers").innerText(), /0/);
  const links = await page
    .locator(".unit-card")
    .evaluateAll((all) => all.map((a) => a.getAttribute("href")));
  assert.equal(new Set(links).size, 12);
  await jump("#/unit/2/words");
  await page.getByRole("heading", { name: "本模块还没有教材词句" }).waitFor();
  const official = page
    .getByRole("link", { name: "打开官方资源", exact: false })
    .first();
  assert.equal(await official.getAttribute("target"), "_blank");
  assert.match(await official.getAttribute("rel"), /noopener noreferrer/);
  assert.match(await official.getAttribute("href"), /book2\/unit2\//);
  await jump("#/materials");
  await upload(fixture);
  await page.getByRole("heading", { name: "确认导入学习资料" }).waitFor();
  await click("cancel");
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("little-english-kb2-v1")).entries
          .length,
    ),
    0,
  );
  await upload(fixture);
  await click("confirm-import");
  await page.getByText("3 个词句", { exact: false }).waitFor();
  await upload(fixture);
  await page.getByText("预计新增", { exact: false }).waitFor();
  await click("confirm-import");
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("little-english-kb2-v1")).entries
          .length,
    ),
    3,
  );
  await upload("{invalid", "bad.json");
  await page.getByRole("heading", { name: "资料未导入" }).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("little-english-kb2-v1")).entries
          .length,
    ),
    3,
  );
  await click("cancel");
  await click("add");
  await page.locator("#entry-en").fill("");
  await click("save-entry");
  await page.locator("#editor-error").filter({ hasText: "非空" }).waitFor();
  assert.equal(await page.locator("#dialog").evaluate((el) => el.open), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#dialog").evaluate((el) => el.open), false);
  await click("add");
  await page.locator("[name=unit]").selectOption("2");
  await page
    .locator("#entry-en")
    .fill("Test <img src=x onerror=window.pwned=1>");
  await page.locator("#entry-zh").fill("仅供安全测试");
  await click("save-entry");
  await jump("#/unit/2/words");
  assert.equal(await page.locator(".entry-row").count(), 3);
  assert.equal(await page.evaluate(() => window.pwned), undefined);
  assert.equal(await page.locator("#main img").count(), 0);
  await page.locator(".skip").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#/unit/2/words");
  await page.waitForFunction(() => document.activeElement.id === "main");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main");
  await page.locator("#entry-search").fill("zzzz");
  await page.getByText("没有找到匹配词句").waitFor();
  await click("clear-search");
  assert.equal(await page.locator("#entry-search").inputValue(), "");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "entry-search",
  );
  await click("reveal");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "study-zh",
  );
  await page.locator(".study-zh").filter({ hasText: "笔记本" }).waitFor();
  await click("master");
  await page.locator(".mastery-row").filter({ hasText: "已掌握" }).waitFor();
  await click("mode-spell");
  assert.equal(
    await page.evaluate(() => document.activeElement.dataset.action),
    "mode-spell",
  );
  await page.locator("#answer").fill("wrong");
  await click("submit-answer");
  await page
    .locator("#answer-feedback")
    .filter({ hasText: "已加入复习本" })
    .waitFor();
  assert.equal(
    await page.locator("[data-action=submit-answer]").isDisabled(),
    true,
  );
  await page.reload();
  await page.locator("h1").waitFor();
  await jump("#/review");
  assert.equal(await page.locator(".entry-row").count(), 1);
  await click("mode-spell");
  await page.locator("#answer").fill(" NOTEBOOK. ");
  await click("submit-answer");
  await page.getByRole("heading", { name: "复习本里还没有错题" }).waitFor();
  await jump("#/progress");
  assert.match(await page.locator(".stat-grid").innerText(), /50%/);
  await jump("#/unit/2/sentences");
  await click("play-entry");
  await page
    .locator("#status")
    .filter({ hasText: "找不到 lesson.wav" })
    .waitFor();
  await jump("#/materials");
  await page.locator("#audio-unit").selectOption("2");
  await page.locator("#audio-files").setInputFiles({
    name: "lesson.wav",
    mimeType: "audio/wav",
    buffer: wav(),
  });
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("little-english-audio-v1", 1);
        r.onerror = reject;
        r.onsuccess = () => {
          window.releaseAudioLock = false;
          const tx = r.result.transaction("files", "readwrite");
          const keep = () => {
            const q = tx.objectStore("files").get("hold");
            q.onsuccess = () => {
              if (!window.releaseAudioLock) keep();
            };
          };
          keep();
          tx.oncomplete = () => r.result.close();
          resolve();
        };
      }),
  );
  await click("confirm-audio");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#dialog").evaluate((el) => el.open), true);
  assert.equal(
    await page.locator("#dialog [data-action=cancel]").isDisabled(),
    true,
  );
  await page.evaluate(() => (window.releaseAudioLock = true));
  await page.getByText("1 个本机录音", { exact: false }).waitFor();
  await page.locator("#audio-files").setInputFiles({
    name: "lesson.wav",
    mimeType: "audio/wav",
    buffer: wav(),
  });
  await click("confirm-audio");
  assert.equal(
    await page.evaluate(async () => {
      const { listAudio } = await import("./audio.js");
      return (await listAudio()).length;
    }),
    1,
  );
  await page.reload();
  await page.getByText("1 个本机录音", { exact: false }).waitFor();
  await jump("#/unit/2/sentences");
  await click("play-entry");
  await page.locator("#player-panel:not([hidden])").waitFor();
  await page.waitForFunction(
    () => document.querySelector("audio").currentTime >= 0.25,
  );
  await page.locator("#speed").selectOption("0.75");
  assert.equal(
    await page.locator("audio").evaluate((a) => a.playbackRate),
    0.75,
  );
  await page.locator("#loop-audio").check();
  await page.waitForTimeout(2100);
  assert.equal(await page.locator("audio").evaluate((a) => a.paused), false);
  assert.equal(await page.locator("#player-error").innerText(), "");
  await page.getByRole("link", { name: "全部单元", exact: false }).click();
  await page.getByRole("heading", { name: "我的英语课本" }).waitFor();
  assert.equal(await page.locator("audio").evaluate((a) => a.paused), true);
  assert.equal(await page.locator("#player-panel").isVisible(), false);
  await jump("#/unit/2/sentences");
  await click("edit");
  await page.locator("[name=end]").fill("9");
  await click("save-entry");
  await click("play-entry");
  await page
    .locator("#player-error")
    .filter({ hasText: "超出录音长度" })
    .waitFor();
  await jump("#/materials");
  const downloadPromise = page.waitForEvent("download");
  await click("export");
  const download = await downloadPromise;
  let data = "";
  for await (const chunk of await download.createReadStream()) data += chunk;
  const backup = JSON.parse(data);
  assert.equal(backup.entries.length, 5);
  assert.equal(Object.values(backup.progress)[0].attempts, 2);
  const large = JSON.stringify({
    entries: Array.from({ length: 700 }, (_, i) => ({
      unit: 1,
      type: "word",
      en: `word${i}`,
      zh: "中".repeat(1990),
    })),
  });
  await upload(large, "large-backup.json");
  await page.getByRole("heading", { name: "确认导入学习资料" }).waitFor();
  await click("cancel");
  await click("paste");
  await page
    .locator("#paste-text")
    .fill("unit\ttype\ten\tzh\n1\tword\tsample\t示例");
  await click("preview-paste");
  await click("confirm-import");
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("little-english-kb2-v1")).entries
          .length,
    ),
    6,
  );
  await context.setOffline(true);
  await page.getByRole("link", { name: "我的课本", exact: true }).click();
  await page.getByRole("heading", { name: "我的英语课本" }).waitFor();
  await context.setOffline(false);
  await mkdir("work/screenshots", { recursive: true });
  for (const [name, width, height] of [
    ["ipad-landscape", 1194, 834],
    ["ipad-portrait", 834, 1194],
    ["phone", 390, 844],
    ["small-phone", 320, 640],
    ["desktop", 1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await jump("#/book");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${name} book overflow`,
    );
    await page.screenshot({
      path: `work/screenshots/${name}.png`,
      fullPage: true,
    });
    await jump("#/unit/2/words");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${name} study overflow`,
    );
    await click("edit");
    assert.equal(
      await page.locator("#dialog").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
      true,
    );
    await page.keyboard.press("Escape");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".study-card")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.screenshot({ path: "work/screenshots/study.png", fullPage: true });
  await click("edit");
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        document
          .querySelector("dialog")
          .addEventListener("close", () => setTimeout(resolve, 0), {
            once: true,
          });
        document.querySelector("#editor-form").requestSubmit();
        document.querySelector(".skip").focus();
      }),
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip",
    "delayed dialog close preserves newer focus",
  );
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  const p2 = await blocked.newPage();
  await p2.goto(base + "#/materials");
  await p2.locator("#storage-warning:not([hidden])").waitFor();
  await p2.locator("#text-file").setInputFiles({
    name: "test.tsv",
    mimeType: "text/tab-separated-values",
    buffer: Buffer.from(fixture),
  });
  await p2.locator("[data-action=confirm-import]").click();
  await p2.getByText("3 个词句", { exact: false }).waitFor();
  await blocked.close();
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("little-english-kb2-v1", "bad"),
  );
  const p3 = await corrupt.newPage();
  await p3.goto(base);
  await p3.locator("#storage-warning:not([hidden])").waitFor();
  assert.equal(
    await p3.evaluate(() => localStorage.getItem("little-english-kb2-v1")),
    "bad",
  );
  await corrupt.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "work/browser-results.json",
    JSON.stringify(
      {
        passed: true,
        viewports: 5,
        flows: [
          "catalog",
          "official-links",
          "import-preview-cancel",
          "deduplication",
          "invalid-import",
          "manual-validation",
          "dialog-escape",
          "xss",
          "search-clear",
          "mastery",
          "dictation",
          "wrong-review",
          "persistence",
          "audio-import",
          "audio-playback",
          "speed",
          "loop",
          "segment-error",
          "export",
          "paste",
          "offline-navigation",
          "reduced-motion",
          "storage-blocked",
          "corrupt-storage",
        ],
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: 5 viewports; catalog, imports, words, sentences, audio, dictation, review, backup, storage recovery.",
  );
} finally {
  await context.close();
  await browser.close();
}
