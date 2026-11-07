import { supabase } from '@/integrations/supabase/client';

// Which assistant answers incoming email for an inbox. Stored per inbox in
// channel_accounts.config.responder and read by the email functions
// (supabase/functions/_shared/ai-guard.ts -> mailboxResponder).
export type Responder = 'personal_assistant' | 'aria' | 'email_receptionist' | 'off';

export const RESPONDER_LABELS: Record<Responder, string> = {
	personal_assistant: 'Personal Assistant',
	aria: 'Aria (sales assistant)',
	email_receptionist: 'AI Receptionist',
	off: 'Nobody (no auto-replies)',
};

export interface EmailInbox {
	id: string;
	/** 'email' or 'whatsapp' */
	channel: string;
	identifier: string;
	provider: string;
	is_active: boolean;
	config: Record<string, any>;
}

export async function loadEmailInboxes(clientId: string): Promise<EmailInbox[]> {
	const { data } = await supabase
		.from('channel_accounts')
		.select('id, identifier, provider, is_active, config, channel')
		.eq('client_id', clientId)
		.in('channel', ['email', 'whatsapp'])
		.order('created_at', { ascending: true });
	return ((data as any[]) || []).map((r) => ({
		id: r.id,
		channel: r.channel,
		identifier: r.identifier,
		provider: r.provider,
		is_active: r.is_active,
		config: r.config || {},
	}));
}

/**
 * Whether new mail in this inbox reaches the app. Gmail needs "Connect with
 * Google" (App Password mailboxes can only send); iCloud is checked on a
 * schedule; other providers (Resend, SMTP, ...) only send.
 */
export function canReceive(inbox: EmailInbox): boolean {
	if (inbox.channel === 'whatsapp') return !!inbox.config?.auth_token;
	if (inbox.provider === 'gmail') return !!inbox.config?.refresh_token;
	return inbox.provider === 'icloud';
}

export function receiveHint(inbox: EmailInbox): string {
	if (inbox.channel === 'whatsapp') return 'Reconnect this number in Settings → Channels.';
	if (inbox.provider === 'gmail') {
		return 'Connected with an App Password, which can only send. Connect with Google to receive email.';
	}
	return 'This provider only sends email, so no assistant can reply here.';
}

/** Mirrors mailboxResponder() in the email functions. */
export function effectiveResponder(
	inbox: EmailInbox,
	active: { aria: boolean; email_receptionist: boolean },
): Responder {
	const chosen = inbox.config?.responder as Responder | undefined;
	if (chosen) return chosen;
	if (inbox.config?.personal_assistant?.enabled) return 'personal_assistant';
	if (active.aria) return 'aria';
	// The receptionist only answers email.
	if (active.email_receptionist && inbox.channel !== 'whatsapp') return 'email_receptionist';
	return 'off';
}

/** Saves who answers this inbox, keeping the Personal Assistant's on/off flag in step. */
export async function saveResponder(inbox: EmailInbox, responder: Responder) {
	const pa = inbox.config?.personal_assistant || {};
	const config = {
		...inbox.config,
		responder,
		personal_assistant: { ...pa, enabled: responder === 'personal_assistant' },
	};
	return supabase.from('channel_accounts').update({ config } as any).eq('id', inbox.id);
}

/** A Personal Assistant can't run without at least the owner's name. */
export function personalAssistantReady(inbox: EmailInbox): boolean {
	return !!inbox.config?.personal_assistant?.owner_name?.trim();
}
