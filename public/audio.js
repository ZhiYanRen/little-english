const DB = "little-english-audio-v1";
let connection;
function open() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("files", { keyPath: "name" });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = null;
        reject(
          new Error("本机音频存储无法打开。请检查浏览器存储权限，再重新导入。"),
        );
      };
      request.onblocked = () => {
        connection = null;
        reject(new Error("音频存储正在被另一个窗口使用，请关闭旧窗口后重试。"));
      };
    });
  return connection;
}
export async function listAudio() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction("files").objectStore("files").getAllKeys();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("无法读取本机录音列表，请重试。"));
  });
}
export async function getAudio(name) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction("files").objectStore("files").get(name);
    r.onsuccess = () => resolve(r.result?.blob ?? null);
    r.onerror = () => reject(new Error("录音读取失败，请重新导入文件。"));
  });
}
export async function saveAudio(files) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite"),
      store = tx.objectStore("files");
    let added = 0;
    for (const file of files) {
      const r = store.getKey(file.name);
      r.onsuccess = () => {
        if (r.result === undefined) {
          store.add({ name: file.name, blob: file });
          added++;
        }
      };
    }
    tx.oncomplete = () => resolve(added);
    tx.onerror = () =>
      reject(
        new Error(
          "录音保存失败，可能是空间不足。未完成的这批导入已取消，请释放空间后重试。",
        ),
      );
    tx.onabort = () => reject(new Error("录音保存被中断，请重新导入。"));
  });
}
export function validateAudioFiles(files) {
  if (!files.length || files.length > 50)
    throw Error("每次请选择 1—50 个音频文件。");
  const names = new Set();
  for (const f of files) {
    if (
      !/\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i.test(f.name) ||
      /[\\/:\u0000-\u001f]/.test(f.name) ||
      f.name.length > 200 ||
      f.size === 0 ||
      f.size > 100 * 1024 * 1024
    )
      throw Error(
        "请选择有效的 mp3、m4a、wav、ogg、webm、aac 或 flac 文件；单个文件须小于 100 MB。",
      );
    if (names.has(f.name))
      throw Error("本次选择中有同名录音，请重命名后再导入。");
    names.add(f.name);
  }
}
