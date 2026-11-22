// 구글 드라이브 API (브라우저에서 직접 호출)
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const FOLDER = "application/vnd.google-apps.folder";
const SHORTCUT = "application/vnd.google-apps.shortcut";
export const FILE_FIELDS = "id,name,mimeType,webViewLink,modifiedTime,size,parents";
const KEY = "sf_drive_token";

let token = null;
try {
  const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  if (saved && saved.exp > Date.now()) token = saved;
} catch (_) { /* 저장소 없음 */ }

export const hasToken = () => !!(token && token.exp > Date.now());
export function setToken(t) {
  token = t ? { t, exp: Date.now() + 55 * 60e3 } : null;
  try { t ? sessionStorage.setItem(KEY, JSON.stringify(token)) : sessionStorage.removeItem(KEY); } catch (_) { /* 무시 */ }
}

export class DriveAuthError extends Error {}

async function req(path, opts = {}) {
  if (!hasToken()) throw new DriveAuthError("no token");
  const headers = { Authorization: `Bearer ${token.t}`, ...(opts.json ? { "Content-Type": "application/json" } : {}) };
  const r = await fetch(path.startsWith("http") ? path : API + path, { method: opts.method || "GET", headers, body: opts.json ? JSON.stringify(opts.json) : undefined });
  if (r.status === 401) { setToken(null); throw new DriveAuthError("expired"); }
  if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
const qs = (o) => new URLSearchParams({ supportsAllDrives: "true", ...o }).toString();
const quote = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function list(q, fields = FILE_FIELDS) {
  const out = [];
  let pageToken;
  do {
    const j = await req(`/files?${qs({ q, fields: `nextPageToken,files(${fields})`, pageSize: "1000", includeItemsFromAllDrives: "true", ...(pageToken ? { pageToken } : {}) })}`);
    out.push(...j.files);
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}
export const children = (folderId) => list(`'${folderId}' in parents and trashed=false`);
export const getFile = (id, fields = "id,name,mimeType,ownedByMe,webViewLink,trashed") => req(`/files/${id}?${qs({ fields })}`);

export async function findOrCreateFolder(name, parent) {
  const found = await list(`'${parent}' in parents and name='${quote(name)}' and mimeType='${FOLDER}' and trashed=false`, "id,name");
  if (found[0]) return found[0].id;
  const f = await req(`/files?${qs({ fields: "id" })}`, { method: "POST", json: { name, mimeType: FOLDER, parents: [parent] } });
  return f.id;
}
export const createFolder = (name, parent = "root") =>
  req(`/files?${qs({ fields: "id,webViewLink" })}`, { method: "POST", json: { name, mimeType: FOLDER, parents: [parent] } });

export const shareWith = (fileId, email) =>
  req(`/files/${fileId}/permissions?${qs({ sendNotificationEmail: "false" })}`, { method: "POST", json: { role: "writer", type: "user", emailAddress: email } });

/* 공유받은 폴더를 내 드라이브(=데스크톱 앱 폴더)에 바로가기로 추가 */
export async function ensureShortcut(targetId, name) {
  const existing = await list(`'root' in parents and mimeType='${SHORTCUT}' and trashed=false`, "id,shortcutDetails");
  if (existing.some((f) => f.shortcutDetails?.targetId === targetId)) return false;
  await req(`/files?${qs({ fields: "id" })}`, { method: "POST", json: { name, mimeType: SHORTCUT, parents: ["root"], shortcutDetails: { targetId } } });
  return true;
}

/* 이어 올리기(resumable) 업로드 + 진행률 */
export async function upload(file, parent, onProgress) {
  if (!hasToken()) throw new DriveAuthError("no token");
  const init = await fetch(`${UPLOAD}?${qs({ uploadType: "resumable", fields: FILE_FIELDS })}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.t}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type || "application/octet-stream",
    },
    body: JSON.stringify({ name: file.name, parents: [parent] }),
  });
  if (init.status === 401) { setToken(null); throw new DriveAuthError("expired"); }
  if (!init.ok) throw new Error(`업로드 시작 실패 ${init.status}`);
  const loc = init.headers.get("Location");
  if (!loc) throw new Error("업로드 주소를 못 받았어요");
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", loc);
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve(JSON.parse(x.responseText)) : reject(new Error(`업로드 실패 ${x.status}`)));
    x.onerror = () => reject(new Error("네트워크 오류"));
    x.send(file);
  });
}

export const folderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;
export const thumbUrl = (id, w = 400) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
export const folderIdFrom = (url = "") => (url.match(/folders\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/) || [])[1] || (/^[\w-]{20,}$/.test(url.trim()) ? url.trim() : null);
