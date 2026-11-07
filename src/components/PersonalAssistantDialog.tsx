import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TIMEZONE_OPTIONS, tzOffsetHours } from '@/lib/timezones';
import { canReceive, receiveHint, type EmailInbox } from '@/lib/emailInboxes';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	inboxes: EmailInbox[];
	initialInboxId?: string;
	onSaved: () => void;
}

// Older settings stored only a short label (e.g. "CST") and a fixed offset.
const LABEL_TO_IANA: Record<string, string> = {
	PT: 'America/Los_Angeles', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
	MT: 'America/Denver', MST: 'America/Denver', MDT: 'America/Denver',
	CT: 'America/Chicago', CST: 'America/Chicago', CDT: 'America/Chicago',
	ET: 'America/New_York', EST: 'America/New_York', EDT: 'America/New_York',
	UTC: 'UTC', GMT: 'Europe/London', UK: 'Europe/London', WAT: 'Africa/Lagos',
};

function defaultTimezone(pa: Record<string, any>): string {
	if (pa.timezone && TIMEZONE_OPTIONS.some((t) => t.iana === pa.timezone)) return pa.timezone;
	const fromLabel = LABEL_TO_IANA[(pa.timezone_label || '').toUpperCase().trim()];
	if (fromLabel) return fromLabel;
	const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return TIMEZONE_OPTIONS.some((t) => t.iana === browser) ? browser : 'America/New_York';
}

const emptyForm = {
	enabled: false,
	owner_name: '',
	assistant_name: '',
	tone: 'warm, courteous, and concise',
	booking_link: '',
	vip_emails: '',
	timezone: 'America/New_York',
	custom_instructions: '',
};

const PersonalAssistantDialog = ({ open, onOpenChange, inboxes, initialInboxId, onSaved }: Props) => {
	const [inboxId, setInboxId] = useState('');
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);

	const inbox = useMemo(() => inboxes.find((i) => i.id === inboxId), [inboxes, inboxId]);
	const receives = inbox ? canReceive(inbox) : false;

	// Pick the inbox to show: the one asked for, else one that already uses the
	// assistant, else the first inbox that can receive email.
	useEffect(() => {
		if (!open) return;
		const pick =
			inboxes.find((i) => i.id === initialInboxId) ||
			inboxes.find((i) => i.config?.personal_assistant?.enabled) ||
			inboxes.find((i) => canReceive(i)) ||
			inboxes[0];
		setInboxId(pick?.id || '');
	}, [open, initialInboxId, inboxes]);

	useEffect(() => {
		if (!inbox) return setForm(emptyForm);
		const pa = inbox.config?.personal_assistant || {};
		setForm({
			enabled: !!pa.enabled && canReceive(inbox),
			owner_name: pa.owner_name || '',
			assistant_name: pa.assistant_name || '',
			tone: pa.tone || emptyForm.tone,
			booking_link: pa.booking_link || '',
			vip_emails: Array.isArray(pa.vip_emails) ? pa.vip_emails.join(', ') : '',
			timezone: defaultTimezone(pa),
			custom_instructions: pa.custom_instructions || '',
		});
	}, [inbox]);

	const save = async () => {
		if (!inbox) return;
		if (form.enabled && !form.owner_name.trim()) {
			toast.error('Add your name so the assistant knows who it works for.');
			return;
		}
		setSaving(true);
		const tz = TIMEZONE_OPTIONS.find((t) => t.iana === form.timezone);
		const personal_assistant = {
			...(inbox.config?.personal_assistant || {}),
			enabled: form.enabled,
			owner_name: form.owner_name.trim(),
			assistant_name: form.assistant_name.trim() || `${form.owner_name.trim()}'s Assistant`,
			tone: form.tone.trim() || emptyForm.tone,
			booking_link: form.booking_link.trim(),
			vip_emails: form.vip_emails.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
			timezone: form.timezone,
			timezone_label: tz?.label || '',
			utc_offset_hours: tzOffsetHours(form.timezone),
			custom_instructions: form.custom_instructions,
		};
		const previous = inbox.config?.responder;
		const responder = form.enabled
			? 'personal_assistant'
			: previous === 'personal_assistant' ? 'off' : previous;
		const config = { ...inbox.config, personal_assistant, ...(responder ? { responder } : {}) };
		const { error } = await supabase.from('channel_accounts').update({ config } as any).eq('id', inbox.id);
		setSaving(false);
		if (error) {
			toast.error('Could not save the Personal Assistant settings.');
			return;
		}
		toast.success(form.enabled ? `Personal Assistant is now answering ${inbox.identifier}` : 'Personal Assistant settings saved');
		onSaved();
		onOpenChange(false);
	};

	const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) => setForm((f) => ({ ...f, [k]: v }));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">🧑‍💼 Personal Assistant</DialogTitle>
					<DialogDescription>
						Answers your email and WhatsApp as your assistant (never as you): scheduling, bookings and questions,
						without selling. It offers times from your calendar and passes anything it can't handle to you.
					</DialogDescription>
				</DialogHeader>

				{inboxes.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Connect an email inbox first in{' '}
						<Link to="/settings?tab=Channels" className="text-primary underline">Settings → Channels</Link>.
					</p>
				) : (
					<div className="space-y-4">
						<div>
							<Label className="text-xs">Inbox</Label>
							<select
								value={inboxId}
								onChange={(e) => setInboxId(e.target.value)}
								className="mt-1 h-10 w-full rounded-md border px-3 text-sm bg-card text-foreground"
							>
								{inboxes.map((i) => (
									<option key={i.id} value={i.id}>
										{i.identifier}
										{i.channel === 'whatsapp' ? ' (WhatsApp)' : canReceive(i) ? '' : ' (send only)'}
									</option>
								))}
							</select>
						</div>

						{inbox && !receives && (
							<div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
								<AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
								<div>
									{receiveHint(inbox)}{' '}
									<Link to="/settings?tab=Channels" className="text-primary underline">Open Channels</Link>
								</div>
							</div>
						)}

						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<p className="text-sm font-medium">Answer this inbox with the Personal Assistant</p>
								<p className="text-[11px] text-muted-foreground">
									New messages here get a reply from your assistant. Aria won't also reply.
								</p>
							</div>
							<Switch checked={form.enabled} disabled={!receives} onCheckedChange={(v) => set('enabled', v)} />
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-xs">Your name</Label>
								<Input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="John Akhilomen" className="mt-1" />
							</div>
							<div>
								<Label className="text-xs">Assistant's name</Label>
								<Input value={form.assistant_name} onChange={(e) => set('assistant_name', e.target.value)} placeholder="Jane" className="mt-1" />
							</div>
						</div>

						<div>
							<Label className="text-xs">Tone</Label>
							<Input value={form.tone} onChange={(e) => set('tone', e.target.value)} className="mt-1" />
						</div>

						<div>
							<Label className="text-xs">Booking link (optional)</Label>
							<Input value={form.booking_link} onChange={(e) => set('booking_link', e.target.value)} placeholder="https://cal.com/you/30min" className="mt-1" />
						</div>

						<div>
							<Label className="text-xs">Your timezone</Label>
							<select
								value={form.timezone}
								onChange={(e) => set('timezone', e.target.value)}
								className="mt-1 h-10 w-full rounded-md border px-3 text-sm bg-card text-foreground"
							>
								{TIMEZONE_OPTIONS.map((t) => (
									<option key={t.iana} value={t.iana}>
										{t.name} ({t.label}, UTC{tzOffsetHours(t.iana) >= 0 ? '+' : ''}{tzOffsetHours(t.iana)})
									</option>
								))}
							</select>
							<p className="text-[11px] text-muted-foreground mt-1">Used when offering meeting times. Daylight saving is handled automatically.</p>
						</div>

						<div>
							<Label className="text-xs">Never auto-reply to (comma separated)</Label>
							<Input value={form.vip_emails} onChange={(e) => set('vip_emails', e.target.value)} placeholder="spouse@example.com, +15551234567" className="mt-1" />
							<p className="text-[11px] text-muted-foreground mt-1">Messages from these email addresses or WhatsApp numbers get a draft for you to approve instead of an automatic reply.</p>
						</div>

						<div>
							<Label className="text-xs">Instructions for your assistant (optional)</Label>
							<Textarea value={form.custom_instructions} onChange={(e) => set('custom_instructions', e.target.value)} rows={3} placeholder="Protect my mornings. Push meetings to the afternoon. Keep replies short." className="mt-1" />
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={save} disabled={saving || !inbox}>{saving ? 'Saving…' : 'Save'}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default PersonalAssistantDialog;
