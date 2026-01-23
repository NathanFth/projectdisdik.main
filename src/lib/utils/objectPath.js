// src/lib/utils/objectPath.js
// ------------------------------------------------------------
// Helpers untuk akses & update nested object secara immutable
// berdasarkan path string (contoh: "guru.pns" atau "siswa.kelas1.l").
//
// Kenapa ini penting?
// - FormData di project ini sangat besar & dalam.
// - Deep-clone via JSON.parse(JSON.stringify(...)) pada setiap input
//   akan berat (CPU + GC) dan membuat re-render tidak perlu.
// - setIn() di bawah hanya meng-clone object pada jalur path yang diubah.
// ------------------------------------------------------------

/** @param {unknown} v */
function isObjectLike(v) {
  return v !== null && typeof v === "object";
}

/** @template T
 *  @param {T} v
 *  @returns {T}
 */
function cloneContainer(v) {
  if (Array.isArray(v)) return /** @type {any} */ (v.slice());
  if (isObjectLike(v)) return /** @type {any} */ ({ ...v });
  return v;
}

/**
 * Split path string jadi array key. Aman untuk input kosong.
 * @param {string | string[]} path
 * @returns {string[]}
 */
export function splitPath(path) {
  if (Array.isArray(path)) return path.filter(Boolean);
  const p = String(path || "").trim();
  if (!p) return [];
  return p.split(".").filter(Boolean);
}

/**
 * Ambil value nested.
 * @template T
 * @param {any} obj
 * @param {string | string[]} path
 * @param {T} [fallback]
 * @returns {any | T}
 */
export function getIn(obj, path, fallback) {
  const keys = splitPath(path);
  if (keys.length === 0) return obj ?? fallback;

  let cur = obj;
  for (const k of keys) {
    if (!isObjectLike(cur)) return fallback;
    cur = cur[k];
  }
  return cur ?? fallback;
}

/**
 * Update nested value secara immutable.
 * - Mengembalikan referensi original jika value tidak berubah (Object.is).
 * - Hanya clone object di sepanjang jalur path.
 * @param {any} obj
 * @param {string | string[]} path
 * @param {any} value
 * @returns {any}
 */
export function setIn(obj, path, value) {
  const keys = splitPath(path);
  if (keys.length === 0) return obj;
  if (!isObjectLike(obj)) return obj;

  const currentValue = getIn(obj, keys, undefined);
  if (Object.is(currentValue, value)) return obj;

  const rootClone = cloneContainer(obj);
  let curOld = obj;
  let curNew = rootClone;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextOld = isObjectLike(curOld) ? curOld[key] : undefined;
    const nextNew = isObjectLike(nextOld) ? cloneContainer(nextOld) : {};

    curNew[key] = nextNew;
    curOld = nextOld;
    curNew = nextNew;
  }

  curNew[keys[keys.length - 1]] = value;
  return rootClone;
}

/**
 * Hapus nested key secara immutable.
 * @param {any} obj
 * @param {string | string[]} path
 * @returns {any}
 */
export function unsetIn(obj, path) {
  const keys = splitPath(path);
  if (keys.length === 0) return obj;
  if (!isObjectLike(obj)) return obj;

  const existing = getIn(obj, keys, undefined);
  if (existing === undefined) return obj;

  const rootClone = cloneContainer(obj);
  let curOld = obj;
  let curNew = rootClone;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextOld = isObjectLike(curOld) ? curOld[key] : undefined;
    if (!isObjectLike(nextOld)) return obj; // struktur tidak sesuai; jangan riskan
    const nextNew = cloneContainer(nextOld);
    curNew[key] = nextNew;
    curOld = nextOld;
    curNew = nextNew;
  }

  delete curNew[keys[keys.length - 1]];
  return rootClone;
}
