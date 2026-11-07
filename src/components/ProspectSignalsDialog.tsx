import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ExternalLink, Loader2 } from 'lucide-react';

export interface SignalSummary { type: string; label: string; strength: number; value: number; age_days: number }
export interface ScoreBreakdown { signals: SignalSummary[]; signal_score: number; fit: number | null; score: number }

interface SignalRow {
	id: string; signal_type: string; label: string; strength: number; source_url: string | null;
	detail: Record<string, any>; observed_at: string;
}

export const SIGNAL_NAMES: Record<string, string> = {
	hiring: 'Hiring', hiring_cluster: 'Hiring cluster', long_open_role: 'Hard to fill', first_hire: 'First hire',
	funding: 'Funding', leadership: 'New leader', rfp: 'Request for proposal', competitor_switch: 'Leaving a competitor', news: 'News',
	acquisition: 'Acquisition', expansion: 'Expansion', launch: 'Launch', incident: 'Security incident', tech_stack: 'Tech stack', tech_change: 'Tool switch',
};

const ago = (days: number) => (days <= 0 ? 'today' : days === 1 ? '1 day ago' : days < 14 ? `${days} days ago` : days < 60 ? `${Math.round(days / 7)} weeks ago` : `${Math.round(days / 30)} months ago`);
const daysSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));

/** Up to three signal chips for the prospects table. */
export function SignalChips({ breakdown, fallback }: { breakdown: ScoreBreakdown | null | undefined; fallback: string | null }) {
	const sigs = breakdown?.signals || [];
	if (!sigs.length) return <span className="line-clamp-2 text-xs">{fallback || '—'}</span>;
	return (
		<div className="flex flex-wrap gap-1">
			{sigs.slice(0, 3).map((s, i) => (
				<span key={i} title={`${s.label} · ${ago(s.age_days)}`}
					className={cn('max-w-[200px] truncate rounded-full px-2 py-0.5 text-[11px]', s.value >= 50 ? 'bg-primary/10 text-foreground' : 'bg-muted text-muted-foreground')}>
					{s.label}
				</span>
			))}
			{sigs.length > 3 && <span className="text-[11px] text-muted-foreground">+{sigs.length - 3}</span>}
		</div>
	);
}

interface Lead {
	id: string; company_name: string | null; intent_score: number; fit_score?: number | null; fit_reason?: string | null;
	talking_point?: string | null; score_breakdown?: ScoreBreakdown | null;
	tech_stack?: { tools?: { name: string; category: string }[]; email_provider?: string | null; checked_at?: string } | null;
}

/** Why a prospect scored what it did: every signal, its age, and fit. */
export default function ProspectSignalsDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
	const [rows, setRows] = useState<SignalRow[] | null>(null);
	useEffect(() => {
		if (!lead) return;
		setRows(null);
		supabase.from('prospect_signals' as any).select('id, signal_type, label, strength, source_url, detail, observed_at')
			.eq('lead_id', lead.id).order('observed_at', { ascending: false })
			.then(({ data }) => setRows((data as any as SignalRow[]) || []));
	}, [lead]);

	const b = lead?.score_breakdown;
	const valueOf = (r: SignalRow) => b?.signals.find((s) => s.label === r.label && s.type === r.signal_type)?.value;
	const pains = [...new Set((rows || []).flatMap((r) => r.detail?.pain_points || []))] as string[];
	const tools = [...new Set((rows || []).flatMap((r) => r.detail?.tools || []))] as string[];

	return (
		<Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{lead?.company_name || 'Prospect'}: score {lead?.intent_score}</DialogTitle>
					<DialogDescription>
						{b ? <>Signals {b.signal_score}{b.fit != null ? <> · fit {b.fit}</> : null}. Signals add up and lose value as they age. A strong fit raises the score and a poor fit lowers it.</> : 'How this lead was found.'}
					</DialogDescription>
				</DialogHeader>

				{lead?.talking_point && (
					<div className="rounded-lg bg-primary/5 p-3 text-sm">
						<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Opening line</div>
						{lead.talking_point}
					</div>
				)}

				<div className="space-y-2">
					{!rows ? <Loader2 className="w-4 h-4 animate-spin" /> : rows.map((r) => {
						const v = valueOf(r);
						return (
							<div key={r.id} className="rounded-lg border p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="text-[11px] text-muted-foreground">{SIGNAL_NAMES[r.signal_type] || r.signal_type} · {ago(daysSince(r.observed_at))}</div>
										<div className="text-sm font-medium text-foreground">{r.label}</div>
									</div>
									<div className="text-right shrink-0">
										<div className="text-sm font-semibold">{v ?? r.strength}</div>
										{v != null && v !== r.strength && <div className="text-[10px] text-muted-foreground">was {r.strength}</div>}
									</div>
								</div>
								{r.detail?.evidence && <p className="mt-1 text-xs text-muted-foreground">"{r.detail.evidence}"</p>}
								{r.detail?.titles?.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{r.detail.titles.slice(0, 6).join(' · ')}</p>}
								{r.detail?.reason && <p className="mt-1 text-xs text-muted-foreground">{r.detail.reason}</p>}
								{r.detail?.people?.length > 0 && (
									<p className="mt-1 text-xs text-muted-foreground">
										{r.detail.people.slice(0, 3).map((p: any) => `${p.name}${p.title ? ` (${p.title})` : ''}`).join(' · ')}
										{r.detail.phone && <> · <a href={`tel:${r.detail.phone}`} className="text-primary hover:underline">{r.detail.phone}</a></>}
									</p>
								)}
								{r.source_url && (
									<a href={r.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
										Source <ExternalLink className="w-3 h-3" />
									</a>
								)}
							</div>
						);
					})}
				</div>

				{pains.length > 0 && (
					<div>
						<div className="text-xs font-medium text-foreground mb-1">From the job description</div>
						<ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">{pains.map((p) => <li key={p}>{p}</li>)}</ul>
					</div>
				)}
				{tools.length > 0 && (
					<div>
						<div className="text-xs font-medium text-foreground mb-1">Tools they use</div>
						<div className="flex flex-wrap gap-1">{tools.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t}</span>)}</div>
					</div>
				)}
				{lead?.tech_stack?.tools && (lead.tech_stack.tools.length > 0 || lead.tech_stack.email_provider) && (
					<div>
						<div className="text-xs font-medium text-foreground mb-1">On their website</div>
						<div className="flex flex-wrap gap-1">
							{lead.tech_stack.tools.map((t) => <span key={t.name} title={t.category} className="rounded-full border px-2 py-0.5 text-[11px]">{t.name}</span>)}
							{lead.tech_stack.email_provider && <span className="rounded-full border px-2 py-0.5 text-[11px]" title="Email provider">Email: {lead.tech_stack.email_provider}</span>}
						</div>
					</div>
				)}
				{lead?.fit_reason && (
					<div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Fit {lead.fit_score}:</span> {lead.fit_reason}</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
