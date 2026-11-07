// Sends errors from the browser to the system-health function, which groups
// them and emails the super admins when a new one appears. Off on localhost.

import { supabase } from '@/integrations/supabase/client';
import { BRAND_ID } from '@/brand';

const MAX_PER_PAGE = 10;
const sent = new Set<string>();

/** After a deploy, an open tab may ask for code files that no longer exist. Reload once to get the new ones. */
const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;

function reloadOnce(): boolean {
	try {
		if (sessionStorage.getItem('reloaded-for-update')) return false;
		sessionStorage.setItem('reloaded-for-update', '1');
	} catch { return false; }
	window.location.reload();
	return true;
}

export function reportError(error: unknown, extra?: { componentStack?: string }) {
	const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error ?? 'Unknown error'));
	if (STALE_CHUNK.test(e.message) && reloadOnce()) return;
	if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
	const key = `${e.message}|${window.location.pathname}`;
	if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
	sent.add(key);
	supabase.functions.invoke('system-health', {
		body: {
			action: 'client-error',
			message: e.message,
			stack: [e.stack, extra?.componentStack].filter(Boolean).join('\n--- component ---\n').slice(0, 4000),
			path: window.location.pathname,
			brand: BRAND_ID,
		},
	}).catch(() => {});
}

export function installErrorReporting() {
	window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message));
	window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason));
}
