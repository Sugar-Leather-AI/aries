// Common timezones for scheduling, shared by the agent settings dialogs.
// Selecting one stores the IANA zone + short label; the backend computes the
// UTC offset when each email is handled, so daylight saving stays correct.
export const TIMEZONE_OPTIONS: { iana: string; label: string; name: string }[] = [
	{ iana: 'America/Los_Angeles', label: 'PT', name: 'Pacific Time (US)' },
	{ iana: 'America/Denver', label: 'MT', name: 'Mountain Time (US)' },
	{ iana: 'America/Phoenix', label: 'MST', name: 'Arizona (no DST)' },
	{ iana: 'America/Chicago', label: 'CT', name: 'Central Time (US)' },
	{ iana: 'America/New_York', label: 'ET', name: 'Eastern Time (US)' },
	{ iana: 'America/Anchorage', label: 'AKT', name: 'Alaska Time' },
	{ iana: 'Pacific/Honolulu', label: 'HST', name: 'Hawaii Time' },
	{ iana: 'America/Toronto', label: 'ET', name: 'Toronto' },
	{ iana: 'America/Sao_Paulo', label: 'BRT', name: 'São Paulo' },
	{ iana: 'UTC', label: 'UTC', name: 'UTC' },
	{ iana: 'Europe/London', label: 'UK', name: 'London' },
	{ iana: 'Europe/Paris', label: 'CET', name: 'Central Europe' },
	{ iana: 'Africa/Lagos', label: 'WAT', name: 'Lagos / West Africa' },
	{ iana: 'Asia/Dubai', label: 'GST', name: 'Dubai' },
	{ iana: 'Asia/Kolkata', label: 'IST', name: 'India' },
	{ iana: 'Asia/Singapore', label: 'SGT', name: 'Singapore' },
	{ iana: 'Asia/Tokyo', label: 'JST', name: 'Tokyo' },
	{ iana: 'Australia/Sydney', label: 'AET', name: 'Sydney' },
];

// Current UTC offset (in hours) for an IANA timezone, using the browser's Intl data.
export const tzOffsetHours = (iana: string): number => {
	try {
		const part = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'shortOffset' })
			.formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
		const m = part.match(/GMT([+-]?\d{1,2})(?::(\d{2}))?/);
		if (!m) return 0;
		const h = parseInt(m[1], 10);
		const min = m[2] ? parseInt(m[2], 10) / 60 : 0;
		return h + (h < 0 ? -min : min);
	} catch {
		return 0;
	}
};
