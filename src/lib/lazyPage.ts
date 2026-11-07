// React.lazy that survives deploys. After a new version goes live, an open tab
// may ask for a page's old code file, which no longer exists. Instead of a blank
// screen, reload once to pick up the new version.
import { lazy, type ComponentType } from "react";

const KEY = "chunk_reload_at";

export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      let last = 0;
      try { last = Number(sessionStorage.getItem(KEY) || 0); } catch { /* ignore */ }
      // Reload at most once a minute, so a real outage doesn't loop.
      if (Date.now() - last > 60_000) {
        try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
