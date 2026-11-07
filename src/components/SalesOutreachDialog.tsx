import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { canReceive, loadEmailInboxes, type EmailInbox } from '@/lib/emailInboxes';
import { BRAND } from '@/brand';

type CheckStatus = 'ok' | 'warn' | 'missing' | 'unknown';
interface SendingHealth {
	channel_account_id: string; email: string;
	health: { domain: string; free_mail: boolean; spf: { status: CheckStatus; detail: string }; dkim: { status: CheckStatus; detail: string }; dmarc: { status: CheckStatus; detail: string } };
	ramp: { started_at: string | null; established: boolean; day: number; limit: number | null; done: boolean; full_limit: number };
	bounces?: { sent: number; bounced: number; rate: number; limit: number };
	paused?: { at: string; reason: string | null } | null;
}

/** How to fix a missing record, in plain words. */
const FIX: Record<'spf' | 'dkim' | 'dmarc', string> = {
	spf: "Add your email provider's SPF record (a TXT record starting v=spf1) to your domain's DNS.",
	dkim: "Turn on DKIM signing in your email provider's settings and add the record it gives you.",
	dmarc: 'Add a TXT record named _dmarc with: v=DMARC1; p=none',
};

/** The sending address's SPF, DKIM and DMARC, and where it is on the cold email ramp. */
function SendingHealthPanel({ item, onEstablished, onResume }: { item: SendingHealth | null | undefined; onEstablished: (v: boolean) => void; onResume: () => void }) {
	if (item === undefined) return <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking the sending address…</p>;
	if (!item) return null;
	const { health: h, ramp: r } = item;
	const icon = (s: CheckStatus) => s === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-px" />
		: s === 'unknown' ? <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-px" /> : <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-px" />;
	const rows: [string, 'spf' | 'dkim' | 'dmarc', string][] = [
		['SPF', 'spf', 'which servers may send for the domain'], ['DKIM', 'dkim', 'signs each email'], ['DMARC', 'dmarc', 'what inboxes do with fakes'],
	];
	const week = Math.floor((r.day - 1) / 7) + 1;
	const today = Math.min(r.limit ?? r.full_limit, r.full_limit);
	const b = item.bounces;
	const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
	return (
		<div className="rounded-lg border p-3 space-y-2">
			<div className="text-xs font-medium">Sending health · {h.domain || item.email}</div>
			{item.paused && (
				<div className="flex items-start gap-1.5 text-[11px] rounded-md border border-destructive/30 bg-destructive/5 p-2">
					<AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-px" />
					<div className="min-w-0 space-y-1.5">
						<p className="text-foreground">
							<span className="font-medium">Sending paused.</span> {item.paused.reason || 'Too many emails bounced'}, above the {pct(b?.limit ?? 0.03)} limit. Bounces tell inboxes the list is poor, which pushes your emails into spam.
							Remove or fix bad addresses in your leads, then resume.
						</p>
						<Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onResume}>Resume sending</Button>
					</div>
				</div>
			)}
			{h.free_mail ? (
				<p className="text-[11px] text-warning">
					This is a personal address. Its provider handles the technical setup, but cold email from personal addresses lands in spam more often. A business domain is safer.
				</p>
			) : (
				<div className="space-y-1.5">
					{rows.map(([label, key, what]) => {
						const c = h[key];
						return (
							<div key={key} className="flex items-start gap-1.5 text-[11px]">
								{icon(c.status)}
								<div className="min-w-0 break-words">
									<span className="font-medium text-foreground">{label}</span> <span className="text-muted-foreground">({what}): </span>
									<span className={c.status === 'ok' ? 'text-muted-foreground' : 'text-foreground'}>{c.status === 'missing' ? `${c.detail}. ${FIX[key]}` : c.detail}</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
			<div className="text-[11px] border-t pt-2 space-y-1.5">
				{r.established ? (
					<p className="text-muted-foreground">Ramp skipped: up to {r.full_limit} emails a day from the start.</p>
				) : r.done ? (
					<p className="text-muted-foreground">Warmed up: sending up to your limit of {r.full_limit} emails a day.</p>
				) : (
					<p className="text-foreground">
						{r.started_at ? `Warming up, week ${week} of 4: up to ` : 'New address: it starts at '}
						<span className="font-medium">{today} cold emails a day</span>. That rises each week (5, 10, 20, 30) and reaches your limit of {r.full_limit} in week 5, so inboxes learn to trust the address.
					</p>
				)}
				{b && b.sent > 0 && (
					<p className={b.rate > b.limit ? 'text-warning' : 'text-muted-foreground'}>
						Bounces: {b.bounced} of {b.sent} cold emails in the last 30 days ({pct(b.rate)}). Sending pauses above {pct(b.limit)}.
					</p>
				)}
				<label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
					<input type="checkbox" checked={r.established} onChange={(e) => onEstablished(e.target.checked)} className="rounded border-input" />
					This address already sends email regularly (skip the ramp)
				</label>
			</div>
		</div>
	);
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const STATUSES = ['Lead', 'Prospect', 'Inactive'];
const DAYS = [
	{ v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);

/** Settings for the Sales Outreach agent (agents.agent_type = 'sales_outreach'). */
export default function SalesOutreachDialog({ open, onOpenChange }: Props) {
	const { user } = useAuth();
	const clientId = user?.clientId;
	const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const [rowId, setRowId] = useState<string | null>(null);
	const [active, setActive] = useState(false);
	const [name, setName] = useState('');
	const [signature, setSignature] = useState('');
	const [sendFrom, setSendFrom] = useState('');
	const [replyTo, setReplyTo] = useState('');
	const [offer, setOffer] = useState('');
	const [cta, setCta] = useState('');
	const [statuses, setStatuses] = useState<string[]>(['Lead', 'Prospect']);
	const [minScore, setMinScore] = useState('0');
	const [tags, setTags] = useState('');
	const [newPerDay, setNewPerDay] = useState('10');
	const [dailyLimit, setDailyLimit] = useState('20');
	const [followups, setFollowups] = useState('3');
	const [gapDays, setGapDays] = useState('3');
	const [sendDays, setSendDays] = useState<number[]>([1, 2, 3, 4, 5]);
	const [start, setStart] = useState(9);
	const [end, setEnd] = useState(17);
	const [timezone, setTimezone] = useState(browserTz);
	const [approveFirst, setApproveFirst] = useState(true);
	const [allowUncertain, setAllowUncertain] = useState(false);
	const [inboxes, setInboxes] = useState<EmailInbox[]>([]);
	const [saving, setSaving] = useState(false);
	const [health, setHealth] = useState<SendingHealth[] | null>(null);

	useEffect(() => {
		if (!open || !clientId) return;
		(async () => {
			const [{ data: agent }, list] = await Promise.all([
				supabase.from('agents' as any).select('id, active, name, config').eq('client_id', clientId)
					.eq('agent_type', 'sales_outreach').order('created_at', { ascending: false }).limit(1).maybeSingle(),
				loadEmailInboxes(clientId),
			]);
			const email = list.filter((i) => i.channel === 'email' && i.is_active);
			setInboxes(email);
			const a = agent as any;
			const c = a?.config || {};
			setRowId(a?.id || null);
			setActive(!!a?.active);
			setName(c.agent_name || '');
			setSignature(c.signature || '');
			setSendFrom(c.channel_account_id || email.find((i) => !canReceive(i))?.id || email[0]?.id || '');
			setReplyTo(c.reply_to || email.find(canReceive)?.identifier || '');
			setOffer(c.offer || '');
			setCta(c.cta || '');
			setStatuses(c.audience_statuses?.length ? c.audience_statuses : ['Lead', 'Prospect']);
			setMinScore(String(c.min_lead_score ?? 0));
			setTags((c.tags || []).join(', '));
			setNewPerDay(String(c.new_leads_per_day ?? 10));
			setDailyLimit(String(c.daily_limit ?? 20));
			setFollowups(String(c.followups ?? 3));
			setGapDays(String(c.followup_gap_days ?? 3));
			setSendDays(c.send_days?.length ? c.send_days : [1, 2, 3, 4, 5]);
			setStart(c.send_start ?? 9);
			setEnd(c.send_end ?? 17);
			setTimezone(c.timezone || browserTz);
			setApproveFirst(c.approve_first !== false);
			setAllowUncertain(c.allow_uncertain_emails === true);
		})();
	}, [open, clientId, browserTz]);

	// SPF, DKIM, DMARC and ramp for each sending address (DNS lookups, so loaded on their own).
	const loadHealth = async () => {
		if (!clientId) return;
		const { data } = await supabase.functions.invoke('sales-outreach', { body: { action: 'sending-health', client_id: clientId } });
		setHealth(((data as any)?.accounts || []) as SendingHealth[]);
	};
	useEffect(() => {
		if (!open || !clientId) return;
		setHealth(null);
		loadHealth().catch(() => setHealth([]));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, clientId]);

	const setEstablished = async (established: boolean) => {
		if (!clientId || !sendFrom) return;
		setHealth((list) => list?.map((h) => (h.channel_account_id === sendFrom ? { ...h, ramp: { ...h.ramp, established } } : h)) ?? list);
		const { data, error } = await supabase.functions.invoke('sales-outreach', { body: { action: 'set-established', client_id: clientId, channel_account_id: sendFrom, established } });
		if (error || (data as any)?.error) toast.error('Could not save that');
		loadHealth().catch(() => {});
	};

	const resumeSending = async () => {
		if (!clientId || !sendFrom) return;
		const { data, error } = await supabase.functions.invoke('sales-outreach', { body: { action: 'resume-sending', client_id: clientId, channel_account_id: sendFrom } });
		if (error || (data as any)?.error) toast.error('Could not resume sending');
		else toast.success('Sending resumed');
		loadHealth().catch(() => {});
	};

	const sender = inboxes.find((i) => i.id === sendFrom);
	const replyInboxes = inboxes.filter(canReceive);
	const repliesUnread = !!sender && !canReceive(sender) && !replyTo;

	const save = async () => {
		if (!clientId) return;
		const agentName = name.trim();
		if (!agentName) { toast.error('Give the agent a name'); return; }
		if (active && !offer.trim()) { toast.error('Say what you offer, so the emails have something to talk about'); return; }
		if (!statuses.length) { toast.error('Pick at least one kind of lead'); return; }
		if (end <= start) { toast.error('The sending hours must end after they start'); return; }
		const n = (v: string, d: number) => (Number.isFinite(parseInt(v)) ? parseInt(v) : d);
		setSaving(true);
		const config = {
			agent_name: agentName,
			signature: signature.trim(),
			channel_account_id: sendFrom || null,
			reply_to: replyTo || null,
			offer: offer.trim(),
			cta: cta.trim(),
			audience_statuses: statuses,
			min_lead_score: Math.max(0, Math.min(100, n(minScore, 0))),
			tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
			new_leads_per_day: Math.max(0, Math.min(50, n(newPerDay, 10))),
			daily_limit: Math.max(1, Math.min(100, n(dailyLimit, 20))),
			followups: Math.max(0, Math.min(5, n(followups, 3))),
			followup_gap_days: Math.max(1, Math.min(14, n(gapDays, 3))),
			send_days: sendDays,
			send_start: start,
			send_end: end,
			timezone,
			approve_first: approveFirst,
			allow_uncertain_emails: allowUncertain,
		};
		const row = { name: agentName, active, config };
		const { error } = rowId
			? await supabase.from('agents' as any).update(row as any).eq('id', rowId)
			: await supabase.from('agents' as any).insert({ ...row, client_id: clientId, agent_type: 'sales_outreach', category: 'Sales' } as any);
		setSaving(false);
		if (error) { toast.error(`Could not save: ${error.message}`); return; }
		toast.success(`${agentName} saved`);
		// Start right away rather than waiting for the next 15-minute run.
		if (active) supabase.functions.invoke('sales-outreach', { body: { action: 'run', client_id: clientId } }).catch(() => {});
		onOpenChange(false);
	};

	const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>📨 Sales Outreach</DialogTitle>
					<DialogDescription>
						Works through leads who aren't clients yet: plans how to win each one, writes a personal first email, and follows up
						until they reply. It stops as soon as they reply, unsubscribe or become a client.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<label className="flex items-center justify-between gap-3">
						<span className="text-sm font-medium">Agent on</span>
						<Switch checked={active} onCheckedChange={setActive} />
					</label>

					<section className="space-y-3">
						<div>
							<Label className="text-xs text-muted-foreground">Agent name (signs the emails)</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Luna" className="mt-1" maxLength={60} />
						</div>
						<div>
							<Label className="text-xs text-muted-foreground">Signature (optional)</Label>
							<Textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={2} className="mt-1 resize-none"
								placeholder="Growth lead, PixelForge Labs · pixelforgelabs.co" />
						</div>
					</section>

					<section className="space-y-3">
						<div>
							<Label className="text-xs text-muted-foreground">Send from</Label>
							<select value={sendFrom} onChange={(e) => setSendFrom(e.target.value)}
								className="w-full mt-1 h-9 rounded-md border border-input bg-card px-2 text-sm">
								{inboxes.map((i) => <option key={i.id} value={i.id}>{i.identifier}</option>)}
							</select>
						</div>
						<div>
							<Label className="text-xs text-muted-foreground">Replies go to</Label>
							<select value={replyTo} onChange={(e) => setReplyTo(e.target.value)}
								className="w-full mt-1 h-9 rounded-md border border-input bg-card px-2 text-sm">
								<option value="">The sending address</option>
								{replyInboxes.map((i) => <option key={i.id} value={i.identifier}>{i.identifier}</option>)}
							</select>
							{repliesUnread ? (
								<p className="text-[11px] text-warning mt-1">
									{sender?.identifier} can only send, so replies to it would never reach {BRAND.short} and follow-ups wouldn't stop. Pick an inbox that receives email.
								</p>
							) : (
								<p className="text-[11px] text-muted-foreground mt-1">
									A reply there stops that lead's follow-ups and shows up in your Inbox. The assistant you picked for that inbox may answer it.
								</p>
							)}
						</div>
						{sendFrom && (
							<SendingHealthPanel item={health === null ? undefined : health.find((h) => h.channel_account_id === sendFrom) || null} onEstablished={setEstablished} onResume={resumeSending} />
						)}
					</section>

					<section className="space-y-3">
						<div>
							<Label className="text-xs text-muted-foreground">What you offer and who it's for</Label>
							<Textarea value={offer} onChange={(e) => setOffer(e.target.value)} rows={3} className="mt-1"
								placeholder="We build custom web apps for small service businesses, usually live in 6 weeks. Best fit: owners juggling spreadsheets and manual bookings." />
						</div>
						<div>
							<Label className="text-xs text-muted-foreground">The next step you want (optional)</Label>
							<Input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1"
								placeholder="A 15-minute call: https://cal.com/you/intro" />
						</div>
					</section>

					<section className="space-y-3">
						<Label className="text-xs text-muted-foreground">Who to contact</Label>
						<div className="flex flex-wrap gap-3">
							{STATUSES.map((s) => (
								<label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
									<input type="checkbox" checked={statuses.includes(s)} onChange={() => setStatuses((l) => toggle(l, s))} className="rounded border-input" />
									{s}s
								</label>
							))}
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-xs text-muted-foreground">Minimum lead score</Label>
								<Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} className="mt-1 h-9" />
							</div>
							<div>
								<Label className="text-xs text-muted-foreground">Only with tags (optional)</Label>
								<Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="saas, local" className="mt-1 h-9" />
							</div>
						</div>
						<p className="text-[11px] text-muted-foreground">
							Clients, unsubscribed contacts, and anyone emailed by someone else in the last 30 days are always skipped.
							Each address is checked before its first email, and ones that don't exist are skipped.
						</p>
						<label className="flex items-start justify-between gap-3">
							<span>
								<span className="text-xs font-medium block">Also email addresses that can't be confirmed</span>
								<span className="text-[11px] text-muted-foreground">
									Some companies' mail servers accept every address, so the check can't tell if a person's mailbox exists. These bounce more often. Off is safer.
								</span>
							</span>
							<Switch checked={allowUncertain} onCheckedChange={setAllowUncertain} />
						</label>
					</section>

					<section className="space-y-3">
						<Label className="text-xs text-muted-foreground">Pace</Label>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-[11px] text-muted-foreground">New leads a day</Label>
								<Input type="number" min={0} max={50} value={newPerDay} onChange={(e) => setNewPerDay(e.target.value)} className="mt-1 h-9" />
							</div>
							<div>
								<Label className="text-[11px] text-muted-foreground">Most emails a day</Label>
								<Input type="number" min={1} max={100} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="mt-1 h-9" />
							</div>
							<div>
								<Label className="text-[11px] text-muted-foreground">Follow-ups per lead</Label>
								<Input type="number" min={0} max={5} value={followups} onChange={(e) => setFollowups(e.target.value)} className="mt-1 h-9" />
							</div>
							<div>
								<Label className="text-[11px] text-muted-foreground">Days between follow-ups</Label>
								<Input type="number" min={1} max={14} value={gapDays} onChange={(e) => setGapDays(e.target.value)} className="mt-1 h-9" />
							</div>
						</div>
						<div>
							<Label className="text-[11px] text-muted-foreground">Send on</Label>
							<div className="flex flex-wrap gap-1.5 mt-1">
								{DAYS.map((d) => (
									<button key={d.v} type="button" onClick={() => setSendDays((l) => toggle(l, d.v))}
										className={`px-2.5 h-7 rounded-md border text-xs ${sendDays.includes(d.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground'}`}>
										{d.l}
									</button>
								))}
							</div>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground text-xs">Between</span>
							<select value={start} onChange={(e) => setStart(Number(e.target.value))} className="h-8 rounded-md border border-input bg-card px-2 text-sm">
								{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
							</select>
							<span className="text-muted-foreground text-xs">and</span>
							<select value={end} onChange={(e) => setEnd(Number(e.target.value))} className="h-8 rounded-md border border-input bg-card px-2 text-sm">
								{Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{hourLabel(h % 24)}</option>)}
							</select>
							<span className="text-[11px] text-muted-foreground">{timezone.replace(/_/g, ' ')}</span>
						</div>
						{timezone !== browserTz && (
							<button type="button" className="text-[11px] underline text-muted-foreground" onClick={() => setTimezone(browserTz)}>
								Use my time zone ({browserTz.replace(/_/g, ' ')})
							</button>
						)}
					</section>

					<label className="flex items-start justify-between gap-3 rounded-lg border p-3">
						<span>
							<span className="text-sm font-medium block">Approve each email before it's sent</span>
							<span className="text-[11px] text-muted-foreground">
								Drafts wait on the <Link to="/outreach" className="underline" onClick={() => onOpenChange(false)}>Outreach</Link> page.
								Turn this off to let {name.trim() || 'the agent'} send on its own.
							</span>
						</span>
						<Switch checked={approveFirst} onCheckedChange={setApproveFirst} />
					</label>

					<p className="text-[11px] text-muted-foreground leading-relaxed">
						Every email includes a one-click opt-out and your business address (Settings → Payments → Invoice details), as US anti-spam law (CAN-SPAM) requires.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={save} disabled={saving}>
						{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
