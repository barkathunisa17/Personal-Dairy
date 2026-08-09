/*
  This file gives your app a "window.storage" object to save data to.

  Right now it saves to the browser's localStorage, so your diary
  data stays on YOUR computer, in YOUR browser only.

  Later, when you connect a real database (like Supabase), you only
  need to rewrite the 4 functions below (get, set, delete, list) to
  talk to that database instead. App.jsx never has to change, because
  it only ever calls window.storage.get(...) / .set(...) etc.
*/

window.storage = {
  async get(key, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    const value = localStorage.getItem(fullKey);
    if (value === null) {
      throw new Error(`Key not found: ${key}`);
    }
    return { key, value, shared };
  },

  async set(key, value, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    localStorage.setItem(fullKey, value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    localStorage.removeItem(fullKey);
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const keys = Object.keys(localStorage)
      .filter((k) => (shared ? k.startsWith("shared:") : !k.startsWith("shared:")))
      .map((k) => (shared ? k.replace("shared:", "") : k))
      .filter((k) => k.startsWith(prefix));
    return { keys, prefix, shared };
  },
};
