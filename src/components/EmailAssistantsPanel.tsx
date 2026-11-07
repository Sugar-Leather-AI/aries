import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Inbox, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	RESPONDER_LABELS,
	canReceive,
	effectiveResponder,
	personalAssistantReady,
	receiveHint,
	saveResponder,
	type EmailInbox,
	type Responder,
} from '@/lib/emailInboxes';

interface Props {
	inboxes: EmailInbox[];
	loading: boolean;
	active: { aria: boolean; email_receptionist: boolean };
	onChanged: () => void;
	onSetUpPersonalAssistant: (inboxId: string) => void;
}

/**
 * One place to see and choose which assistant answers each email inbox.
 * Replaces the old hidden rule where turning on the Personal Assistant silently
 * stopped Aria for that inbox.
 */
const EmailAssistantsPanel = ({ inboxes, loading, active, onChanged, onSetUpPersonalAssistant }: Props) => {
	const [savingId, setSavingId] = useState<string | null>(null);

	// Receptionist only appears for accounts that still have it switched on.
	// The receptionist only answers email, so WhatsApp numbers never offer it.
	const optionsFor = (inbox: EmailInbox): Responder[] => [
		'personal_assistant', 'aria',
		...(active.email_receptionist && inbox.channel !== 'whatsapp' ? ['email_receptionist' as const] : []),
		'off',
	];

	const choose = async (inbox: EmailInbox, responder: Responder) => {
		if (responder === 'personal_assistant' && !personalAssistantReady(inbox)) {
			// Needs a name, tone and so on first: open the settings instead.
			onSetUpPersonalAssistant(inbox.id);
			return;
		}
		setSavingId(inbox.id);
		const { error } = await saveResponder(inbox, responder);
		setSavingId(null);
		if (error) {
			toast.error('Could not save. Please try again.');
			return;
		}
		toast.success(
			responder === 'off'
				? `No automatic replies for ${inbox.identifier}`
				: `${RESPONDER_LABELS[responder]} now answers ${inbox.identifier}`,
		);
		onChanged();
	};

	return (
		<div className="stat-card">
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="flex items-center gap-2">
					<Inbox className="w-4 h-4 text-primary" />
					<div>
						<h2 className="text-sm font-semibold text-foreground">Who answers your messages?</h2>
						<p className="text-xs text-muted-foreground">Pick one assistant per inbox or WhatsApp number. Only that assistant replies there.</p>
					</div>
				</div>
				<Link to="/settings?tab=Channels" className="text-xs text-primary hover:underline whitespace-nowrap">
					Manage inboxes
				</Link>
			</div>

			{loading ? (
				<p className="text-xs text-muted-foreground">Loading inboxes…</p>
			) : inboxes.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No email inbox or WhatsApp number connected yet.{' '}
					<Link to="/settings?tab=Channels" className="text-primary underline">Connect one in Settings → Channels</Link>.
				</p>
			) : (
				<div className="divide-y">
					{inboxes.map((inbox) => {
						const receives = canReceive(inbox);
						const current = receives ? effectiveResponder(inbox, active) : 'off';
						const warning =
							!receives ? receiveHint(inbox)
							: current === 'aria' && !active.aria ? 'Aria is switched off, so this inbox gets no replies. Turn Aria on below.'
							: current === 'personal_assistant' && !personalAssistantReady(inbox) ? 'Finish setting up the Personal Assistant for this inbox.'
							: null;
						return (
							<div key={inbox.id} className="py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									{inbox.channel === 'whatsapp'
										? <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
										: <Mail className="w-4 h-4 text-muted-foreground shrink-0" />}
									<span className="text-sm text-foreground truncate">{inbox.identifier}</span>
									<span
										className={cn(
											'text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
											receives ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
										)}
									>
										{inbox.channel === 'whatsapp' ? 'WhatsApp' : receives ? 'Receives email' : 'Send only'}
									</span>
								</div>
								<div className="flex items-center gap-2">
									{receives ? (
										<select
											value={current}
											disabled={savingId === inbox.id}
											onChange={(e) => choose(inbox, e.target.value as Responder)}
											className="h-8 rounded-md border px-2 text-xs bg-card text-foreground"
											aria-label={`Who answers ${inbox.identifier}`}
										>
											{optionsFor(inbox).map((o) => (
												<option key={o} value={o}>{RESPONDER_LABELS[o]}</option>
											))}
										</select>
									) : (
										<Button asChild size="sm" variant="outline" className="h-8 text-xs">
											<Link to="/settings?tab=Channels">{inbox.channel === 'whatsapp' ? 'Reconnect' : 'Connect with Google'}</Link>
										</Button>
									)}
									{receives && current === 'personal_assistant' && (
										<Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onSetUpPersonalAssistant(inbox.id)}>
											Settings
										</Button>
									)}
								</div>
								{warning && (
									<div className="sm:basis-full flex items-start gap-1.5 text-[11px] text-warning">
										<AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
										<span>{warning}</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default EmailAssistantsPanel;
