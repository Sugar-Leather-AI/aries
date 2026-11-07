import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { loadEmailInboxes, type EmailInbox } from '@/lib/emailInboxes';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/** Settings for the Google Review Generator (agents.agent_type = 'review_request'). */
export default function ReviewAgentDialog({ open, onOpenChange }: Props) {
	const { user } = useAuth();
	const clientId = user?.clientId;
	const [rowId, setRowId] = useState<string | null>(null);
	const [active, setActive] = useState(false);
	const [delayDays, setDelayDays] = useState('0');
	const [reminder, setReminder] = useState(true);
	const [reminderDays, setReminderDays] = useState('5');
	const [mailbox, setMailbox] = useState('');
	const [inboxes, setInboxes] = useState<EmailInbox[]>([]);
	const [hasPlaceId, setHasPlaceId] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open || !clientId) return;
		(async () => {
			const [{ data: agent }, list, { data: client }] = await Promise.all([
				supabase.from('agents' as any).select('id, active, config').eq('client_id', clientId)
					.eq('agent_type', 'review_request').order('created_at', { ascending: false }).limit(1).maybeSingle(),
				loadEmailInboxes(clientId),
				supabase.from('clients').select('google_place_id').eq('id', clientId).single(),
			]);
			const a = agent as any;
			const cfg = a?.config || {};
			setRowId(a?.id || null);
			setActive(!!a?.active);
			setDelayDays(String(cfg.delay_days ?? 0));
			setReminder(cfg.reminder !== false);
			setReminderDays(String(cfg.reminder_days ?? 5));
			setMailbox(cfg.channel_account_id || '');
			setInboxes(list.filter((i) => i.channel === 'email' && i.is_active));
			setHasPlaceId(!!(client as any)?.google_place_id);
		})();
	}, [open, clientId]);

	const save = async () => {
		if (!clientId) return;
		setSaving(true);
		const config = {
			delay_days: Math.max(0, Math.min(30, parseInt(delayDays) || 0)),
			reminder,
			reminder_days: Math.max(2, Math.min(30, parseInt(reminderDays) || 5)),
			channel_account_id: mailbox || null,
		};
		const { error } = rowId
			? await supabase.from('agents' as any).update({ active, config } as any).eq('id', rowId)
			: await supabase.from('agents' as any).insert({
				client_id: clientId, agent_type: 'review_request', name: 'Google Review Generator', active, config,
			} as any);
		setSaving(false);
		if (error) { toast.error(`Could not save: ${error.message}`); return; }
		toast.success('Google Review Generator saved');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>⭐ Google Review Generator</DialogTitle>
					<DialogDescription>
						When you mark a project completed, it drafts a short, personal email asking the project's contact for a
						Google review. You approve each one on the Reputation page before it's sent.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<label className="flex items-center justify-between gap-3">
						<span className="text-sm font-medium">Agent on</span>
						<Switch checked={active} onCheckedChange={setActive} />
					</label>

					{!hasPlaceId && (
						<p className="text-xs text-warning">
							Add your Google Place ID in <Link to="/settings" className="underline" onClick={() => onOpenChange(false)}>Settings</Link> first,
							so the email can link to your review page.
						</p>
					)}

					<div>
						<Label className="text-xs text-muted-foreground">Draft the request</Label>
						<div className="flex items-center gap-2 mt-1">
							<Input type="number" min={0} max={30} value={delayDays} onChange={(e) => setDelayDays(e.target.value)} className="w-20 h-9" />
							<span className="text-sm text-muted-foreground">days after the project is completed (0 = right away)</span>
						</div>
					</div>

					<div className="space-y-2">
						<label className="flex items-center justify-between gap-3">
							<span className="text-sm">Send one reminder if they haven't opened the link</span>
							<Switch checked={reminder} onCheckedChange={setReminder} />
						</label>
						{reminder && (
							<div className="flex items-center gap-2">
								<Input type="number" min={2} max={30} value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} className="w-20 h-9" />
								<span className="text-sm text-muted-foreground">days after the approved request</span>
							</div>
						)}
						<p className="text-[11px] text-muted-foreground">The reminder is a short fixed note and only follows a request you approved.</p>
					</div>

					<div>
						<Label className="text-xs text-muted-foreground">Send from</Label>
						<select value={mailbox} onChange={(e) => setMailbox(e.target.value)}
							className="w-full mt-1 h-9 rounded-md border border-input bg-card px-2 text-sm">
							<option value="">Your main mailbox</option>
							{inboxes.map((i) => <option key={i.id} value={i.id}>{i.identifier}</option>)}
						</select>
					</div>

					<p className="text-[11px] text-muted-foreground leading-relaxed">
						Every completed project's contact gets the same kind of request, whatever you expect them to say; Google doesn't
						allow asking only happy customers. Each customer is asked at most once every 90 days, and never if they've already
						reviewed you.
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
