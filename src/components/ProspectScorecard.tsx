import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/** Leads found this week, how many fit, how many have someone to email, and how many replied. */
interface Week { found: number; scored: number; strong: number; contact: number; verified: number }
interface Card { now: Week; before: Week; emailed: number; replied: number; good: number; removed: number }

const DAY = 86400_000;
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : null);

async function week(clientId: string, from: number, to: number): Promise<Week> {
	const range = () => (supabase.from('prospected_leads' as any) as any)
		.select('id', { count: 'exact', head: true })
		.eq('client_id', clientId)
		.gte('prospected_at', new Date(from).toISOString())
		.lt('prospected_at', new Date(to).toISOString());
	const [found, scored, strong, contact, verified] = await Promise.all([
		range(),
		range().not('fit_score', 'is', null),
		range().gte('fit_score', 60),
		range().not('contact_email', 'is', null),
		range().not('contact_email', 'is', null).or('email_check.eq.valid,email_verified.eq.true'),
	]);
	return { found: found.count || 0, scored: scored.count || 0, strong: strong.count || 0, contact: contact.count || 0, verified: verified.count || 0 };
}

/** The weekly scorecard above Prospected Leads (targets: half strong fits, 60% with a contact). */
export default function ProspectScorecard({ clientId }: { clientId: string }) {
	const [card, setCard] = useState<Card | null>(null);

	useEffect(() => {
		let gone = false;
		(async () => {
			const now = Date.now();
			const since30 = new Date(now - 30 * DAY).toISOString();
			const plans = () => (supabase.from('outreach_plans' as any) as any)
				.select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('created_at', since30).not('last_sent_at', 'is', null);
			const [thisWeek, lastWeek, emailed, replied, removed] = await Promise.all([
				week(clientId, now - 7 * DAY, now),
				week(clientId, now - 14 * DAY, now - 7 * DAY),
				plans(),
				plans().in('status', ['replied', 'converted']),
				(supabase.from('prospected_leads' as any) as any).select('id', { count: 'exact', head: true })
					.eq('client_id', clientId).not('dismissed_at', 'is', null).is('dismiss_reason', null),
			]);
			if (!gone) setCard({ now: thisWeek, before: lastWeek, emailed: emailed.count || 0, replied: replied.count || 0, good: replied.count || 0, removed: removed.count || 0 });
		})().catch(() => {});
		return () => { gone = true; };
	}, [clientId]);

	if (!card) return null;
	const { now: w, before: b } = card;
	const fit = pct(w.strong, w.scored);
	const reach = pct(w.contact, w.found);
	const reply = pct(card.replied, card.emailed);
	const trend = (a: number | null, z: number | null) => (a == null || z == null || a === z ? '' : a > z ? ` ▲ from ${z}%` : ` ▼ from ${z}%`);
	const items = [
		{ label: 'Leads found', week: true, value: String(w.found), note: b.found ? `last week ${b.found}` : '', ok: null as boolean | null },
		{ label: 'Strong fit', week: true, value: fit == null ? '–' : `${fit}%`, note: `target 50%${trend(fit, pct(b.strong, b.scored))}`, ok: fit == null ? null : fit >= 50 },
		{ label: 'With a contact', week: true, value: reach == null ? '–' : `${reach}%`, note: `target 60%${w.contact ? `, ${w.verified} verified` : ''}`, ok: reach == null ? null : reach >= 60 },
		{ label: 'Replied', week: false, value: reply == null ? '–' : `${reply}%`, note: card.emailed ? `${card.replied} of ${card.emailed} emailed` : 'no outreach yet', ok: null },
	];
	const learning = [card.good >= 2 && `${card.good} replies`, card.removed >= 2 && `${card.removed} leads you removed`].filter(Boolean).join(' and ');

	return (
		<div className="px-3 py-2.5 border-b space-y-1.5">
			<div className="flex flex-wrap gap-x-6 gap-y-2">
				{items.map((i) => (
					<div key={i.label} className="min-w-[110px]">
						<div className="text-[11px] text-muted-foreground">{i.label} <span className="opacity-70">· {i.week ? 'this week' : 'last 30 days'}</span></div>
						<div className={cn('text-base font-semibold', i.ok === true && 'text-success', i.ok === false && 'text-warning')}>{i.value}</div>
						<div className="text-[10px] text-muted-foreground">{i.note}</div>
					</div>
				))}
			</div>
			<p className="text-[11px] text-muted-foreground">
				{learning
					? `Finding more like what works: scoring learns from ${learning}.`
					: 'Scoring starts learning from your results once leads reply to outreach (or you remove a couple that are wrong for you).'}
			</p>
		</div>
	);
}
