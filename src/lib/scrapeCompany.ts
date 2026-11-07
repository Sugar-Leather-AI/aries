import { supabase } from '@/integrations/supabase/client';

/** What the scrape-company function returns for a website: company details and the pages it read. */
export interface ScrapedCompany {
	info: Record<string, any>;
	pages: { url: string; title?: string; content: string; page_type?: string }[];
}

/**
 * Scrapes a company's website ("Auto-fill" in the add and edit company forms):
 * starts the scrape, then checks every 5 seconds for up to 6 minutes.
 */
export async function scrapeCompany(website: string): Promise<ScrapedCompany> {
	const { data: startData, error: startErr } = await supabase.functions.invoke('scrape-company', { body: { website } });
	if (startErr) throw startErr;
	if (startData?.error) throw new Error(startData.error);
	const runId = startData?.runId;
	if (!runId) throw new Error('Failed to start scraper');

	for (let i = 0; i < 72; i++) {
		await new Promise((r) => setTimeout(r, 5000));
		const { data, error } = await supabase.functions.invoke('scrape-company', { body: { runId } });
		if (error) throw error;
		if (data?.error) throw new Error(data.error);
		if (data?.status === 'failed') throw new Error(data.error || 'Scraping failed');
		if (data?.status === 'done') return { info: data.data || {}, pages: data.pages || [] };
	}
	throw new Error('Scraping timed out after 6 minutes');
}

/** Form fields the scrape can fill. */
export const SCRAPED_FIELDS = [
	'name', 'industry', 'segment', 'description', 'phone', 'email', 'address', 'city', 'state', 'country',
	'employee_count', 'revenue_range', 'founded_year', 'social_linkedin', 'social_twitter', 'social_facebook',
] as const;
