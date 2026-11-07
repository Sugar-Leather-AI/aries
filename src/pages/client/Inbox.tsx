import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mockConversations, mockMessages } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
	Search,
	Phone,
	Mail,
	Tag,
	Send,
	Paperclip,
	Smile,
	Bot,
	User,
	MessageSquare,
	Loader2,
	Plus,
	X,
	Check,
	CheckCheck,
	Eye,
	MousePointerClick,
	AlertTriangle,
	XCircle,
	Calendar,
	Briefcase,
	Receipt,
	UserPlus,
	MessageCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateInvoiceDialog } from '@/components/payments/CreateInvoiceDialog';
import { AddDealDialog, type AddDealDefaults } from '@/components/deals/AddDealDialog';
import { BRAND } from "@/brand";

const stripHtml = (html: string) => {
	if (!html) return '';
	const text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
	const el = document.createElement('textarea');
	el.innerHTML = text;
	return el.value.trim();
};

interface Contact {
	id: string;
	first_name: string;
	last_name: string;
	email: string | null;
	phone: string | null;
}

const channels = ['All', 'SMS', 'WhatsApp', 'Email', 'Chat']; // Will add LinkedIn and Facebook Later

interface Conversation {
	contact_id: string;
	contact_name: string;
	avatar: string;
	channel: string;
	preview: string;
	last_message_at: string;
	unread: boolean;
	needs_review?: boolean;
	// An AI agent replied (or drafted a reply) in this thread.
	ai_handled?: boolean;
	// Thread has SMS/Chat messages, which always show.
	has_non_email?: boolean;
	// Agents that sent messages in this thread (metadata.agent), e.g. sales_outreach.
	agents?: string[];
	contact_email: string | null;
	contact_phone: string | null;
	lead_score: number | null;
	tags: string[] | null;
}

// Agent keys in messages.metadata.agent, grouped the way owners think of them.
const AGENT_GROUP: Record<string, string> = {
	aria: 'aria', personal_assistant: 'aria', email_receptionist: 'aria', email_sales: 'aria', lead_capture: 'aria',
	sales_outreach: 'sales_outreach', account_growth: 'account_growth', review_request: 'review_request',
	payment_reminder: 'payment_reminder', appointment_reminder: 'appointment_reminder',
};
const AGENT_LABEL: Record<string, string> = {
	aria: 'Aria', sales_outreach: 'Sales outreach', account_growth: 'Account Growth', review_request: 'Review requests',
	payment_reminder: 'Payment reminders', appointment_reminder: 'Appointment reminders',
};

/** The message a function returned with its error status (falls back to the generic error). */
async function functionError(error: any, data?: any): Promise<string | null> {
	if (data?.error) return data.error;
	if (!error) return null;
	const body = await error.context?.json?.().catch(() => null);
	return body?.error || error.message || 'Request failed';
}

/** Shown in the main list: any SMS/Chat thread, or an email thread an AI agent handled. */
const isShownByDefault = (c: Conversation) => !!(c.has_non_email || c.ai_handled);

interface Message {
	id: string;
	direction: string;
	channel: string;
	content: string;
	sender_name: string | null;
	sent_at: string;
	status: string | null;
	is_read: boolean;
	recipient_identifier?: string | null;
	subject?: string | null;
	client_id?: string | null;
	metadata?: {
		needs_review?: boolean;
		flag_note?: string;
		intent?: string;
		draft_reply?: string;
		draft_subject?: string;
		draft_channel_account_id?: string;
		draft_sender_name?: string;
		draft_channel?: string;
	} | null;
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; icon: React.ReactNode; className: string }
> = {
	sent: {
		label: 'Sent',
		icon: <Check className="w-3 h-3" />,
		className: 'text-muted-foreground',
	},
	delivered: {
		label: 'Delivered',
		icon: <CheckCheck className="w-3 h-3" />,
		className: 'text-emerald-500',
	},
	opened: {
		label: 'Opened',
		icon: <Eye className="w-3 h-3" />,
		className: 'text-blue-500',
	},
	clicked: {
		label: 'Clicked',
		icon: <MousePointerClick className="w-3 h-3" />,
		className: 'text-ember-500',
	},
	delivery_delayed: {
		label: 'Delayed',
		icon: <AlertTriangle className="w-3 h-3" />,
		className: 'text-amber-500',
	},
	bounced: {
		label: 'Bounced',
		icon: <XCircle className="w-3 h-3" />,
		className: 'text-destructive',
	},
	failed: {
		label: 'Failed',
		icon: <XCircle className="w-3 h-3" />,
		className: 'text-destructive',
	},
	complained: {
		label: 'Spam',
		icon: <AlertTriangle className="w-3 h-3" />,
		className: 'text-destructive',
	},
	suppressed: {
		label: 'Suppressed',
		icon: <XCircle className="w-3 h-3" />,
		className: 'text-destructive',
	},
};

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	return `${days}d ago`;
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

type ComposeChannel = 'sms' | 'whatsapp' | 'email' | 'note';

const Inbox = () => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(
		null,
	);
	const [channelFilter, setChannelFilter] = useState('All');
	// Email threads no AI agent has answered are hidden unless this is on.
	const [showOtherEmail, setShowOtherEmail] = useState(false);
	const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
	// Filter by the AI agent that emailed the contact, shown with the agent's own name.
	const [agentFilter, setAgentFilter] = useState<string | null>(null);
	const [agentNames, setAgentNames] = useState<Record<string, string>>({});
	useEffect(() => {
		if (!user?.clientId) return;
		(supabase.from('agents' as any).select('agent_type, name, config').eq('client_id', user.clientId) as any).then(({ data }: { data: any[] | null }) => {
			const names: Record<string, string> = {};
			for (const a of data || []) {
				const custom = a.config?.agent_name || a.config?.bot_name;
				if (custom) names[a.agent_type] = custom;
			}
			setAgentNames(names);
		});
	}, [user?.clientId]);
	const [threadMessages, setThreadMessages] = useState<Message[]>([]);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [search, setSearch] = useState('');
	const [hasRealData, setHasRealData] = useState(false);
	const [composeChannel, setComposeChannel] = useState<ComposeChannel>('sms');
	// Reply on the channel the conversation is on.
	useEffect(() => {
		const c = conversations.find((x) => x.contact_id === selectedContactId);
		if (!c) return;
		setComposeChannel(c.channel === 'WhatsApp' ? 'whatsapp' : c.channel === 'Email' ? 'email' : 'sms');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedContactId]);
	const [emailSubject, setEmailSubject] = useState('');
	const [sending, setSending] = useState(false);
	const [showCompose, setShowCompose] = useState(false);
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [contactSearch, setContactSearch] = useState('');
	const [selectedComposeContact, setSelectedComposeContact] =
		useState<Contact | null>(null);
	const [composeNewChannel, setComposeNewChannel] = useState<'sms' | 'email'>(
		'email',
	);
	const [composeSubject, setComposeSubject] = useState('');
	const [composeBody, setComposeBody] = useState('');
	const [composeSending, setComposeSending] = useState(false);
	const [emailStats, setEmailStats] = useState<Record<string, number>>({});
	const [scoringContactId, setScoringContactId] = useState<string | null>(null);

	// ── Add as Contact ────────────────────────────────────────────────
	const [addContactOpen, setAddContactOpen] = useState(false);
	const [newContactFirstName, setNewContactFirstName] = useState('');
	const [newContactLastName, setNewContactLastName] = useState('');
	const [newContactEmail, setNewContactEmail] = useState('');
	const [newContactPhone, setNewContactPhone] = useState('');
	const [savingContact, setSavingContact] = useState(false);

	// ── Book Appointment ──────────────────────────────────────────────
	const [bookOpen, setBookOpen] = useState(false);
	const [calUrl, setCalUrl] = useState('');
	const [aptDate, setAptDate] = useState('');
	const [aptTime, setAptTime] = useState('09:00');
	const [aptService, setAptService] = useState('');
	const [aptDuration, setAptDuration] = useState('30');
	const [aptNotes, setAptNotes] = useState('');
	const [booking, setBooking] = useState(false);

	// ── Create Deal ───────────────────────────────────────────────────
	const [dealOpen, setDealOpen] = useState(false);

	// ── Send Invoice ──────────────────────────────────────────────────
	const [invoiceOpen, setInvoiceOpen] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Load Cal.com URL when client changes
	useEffect(() => {
		if (user?.clientId) {
			supabase.from('clients').select('cal_url').eq('id', user.clientId).single().then(({ data }) => {
				if (data && (data as any).cal_url) setCalUrl((data as any).cal_url);
			});
		}
	}, [user?.clientId]);

	const getCalEmbedUrl = (url: string) => {
		if (!url) return '';
		let cleaned = url.trim();
		if (!cleaned.startsWith('http')) cleaned = `https://${cleaned}`;
		try {
			const parsed = new URL(cleaned);
			if (parsed.hostname.includes('cal.com')) {
				return `${cleaned}?embed=true&layout=month_view&hideBranding=true`;
			}
		} catch { /* invalid */ }
		return '';
	};

	const handleBookAppointment = async () => {
		const sel = conversations.find((c) => c.contact_id === selectedContactId);
		if (!aptDate) { toast({ title: 'Date required', variant: 'destructive' }); return; }
		setBooking(true);
		try {
			const scheduled_at = new Date(`${aptDate}T${aptTime}`).toISOString();
			const { error } = await supabase.from('appointments').insert({
				client_id: user?.clientId,
				contact_id: sel?.contact_id || null,
				scheduled_at,
				service: aptService || null,
				notes: aptNotes || null,
				duration_minutes: parseInt(aptDuration),
			});
			if (error) throw error;
			toast({ title: 'Appointment booked!' });
			setBookOpen(false);
			setAptDate(''); setAptTime('09:00'); setAptService(''); setAptDuration('30'); setAptNotes('');
		} catch (e: any) {
			toast({ title: e.message || 'Failed to book appointment', variant: 'destructive' });
		} finally {
			setBooking(false);
		}
	};



	// Fetch email delivery stats
	const fetchEmailStats = async () => {
		const { data } = await supabase.from('email_events').select('event_type');
		if (!data) return;
		const counts: Record<string, number> = {};
		for (const row of data) {
			counts[row.event_type] = (counts[row.event_type] || 0) + 1;
		}
		setEmailStats(counts);
	};

	// Fetch conversations grouped by contact (or sender_name for unknown contacts)
	const fetchConversations = async () => {
		const { data, error } = await supabase
			.from('messages')
			.select(
				'contact_id, content, channel, sent_at, sender_name, direction, recipient_identifier, is_read, metadata, contacts(first_name, last_name, email, phone, lead_score, tags)',
			)
			.order('sent_at', { ascending: false });

		if (error || !data || data.length === 0) {
			setHasRealData(false);
			setLoading(false);
			return;
		}

		const contactMap = new Map<string, Conversation>();
		for (const row of data) {
			// Group by contact_id if available; for unknown contacts, use recipient_identifier (external party's phone/email)
			let groupKey: string;
			if (row.contact_id) {
				groupKey = row.contact_id;
			} else if (row.recipient_identifier) {
				// Both inbound and outbound store the external party's phone/email here
				groupKey = `unknown_${row.recipient_identifier}`;
			} else {
				// Fallback for old messages without recipient_identifier
				groupKey = `unknown_${row.sender_name}`;
			}
			const isUnreadInbound = row.direction === 'inbound' && !row.is_read;
			const md = row.metadata as any;
			const rowNeedsReview = !!md?.needs_review;
			const rowAiHandled =
				(row.direction === 'outbound' && !!md?.agent) || rowNeedsReview || !!md?.draft_reply;
			const rowNonEmail = row.channel !== 'Email';
			const rowAgent = row.direction === 'outbound' && typeof md?.agent === 'string' ? (AGENT_GROUP[md.agent] || md.agent) : null;
			if (contactMap.has(groupKey)) {
				// Aggregate unread / needs-review / AI state across all messages in the thread
				const existing = contactMap.get(groupKey)!;
				if (rowAgent && !existing.agents!.includes(rowAgent)) existing.agents!.push(rowAgent);
				if (isUnreadInbound) existing.unread = true;
				if (rowNeedsReview) existing.needs_review = true;
				if (rowAiHandled) existing.ai_handled = true;
				if (rowNonEmail) existing.has_non_email = true;
				continue;
			}
			const contact = row.contacts as any;
			const hasContact = contact && (contact.first_name || contact.last_name);
			const externalIdentifier = row.recipient_identifier || row.sender_name;
			const name = hasContact
				? `${contact.first_name} ${contact.last_name}`.trim()
				: externalIdentifier || 'Unknown';
			contactMap.set(groupKey, {
				contact_id: groupKey,
				contact_name: name,
				avatar: getInitials(name || '??'),
				channel: row.channel,
				preview: (() => {
					const t = stripHtml(row.content || '');
					return t.slice(0, 50) + (t.length > 50 ? '...' : '');
				})(),
				last_message_at: row.sent_at,
				unread: isUnreadInbound,
				needs_review: rowNeedsReview,
				ai_handled: rowAiHandled,
				has_non_email: rowNonEmail,
				agents: rowAgent ? [rowAgent] : [],
				contact_email: hasContact ? contact.email : null,
				contact_phone: hasContact ? contact.phone : externalIdentifier || null,
				lead_score: hasContact ? contact.lead_score : null,
				tags: hasContact ? contact.tags : null,
			});
		}

		// De-duplicate: merge unknown_ threads whose identifier matches a known contact's email
		// e.g. "unknown_dana@acme.com" should merge into Dana's contact thread
		const emailToContactId = new Map<string, string>();
		for (const [key, conv] of contactMap.entries()) {
			if (!key.startsWith('unknown_') && conv.contact_email) {
				emailToContactId.set(conv.contact_email.toLowerCase(), key);
			}
		}
		for (const [key] of contactMap.entries()) {
			if (!key.startsWith('unknown_')) continue;
			const identifier = key.replace('unknown_', '').toLowerCase();
			const matchedContactId = emailToContactId.get(identifier);
			if (matchedContactId) {
				// Merge: take the later last_message_at and combined unread state
				const unknown = contactMap.get(key)!;
				const known = contactMap.get(matchedContactId)!;
				if (unknown.last_message_at > known.last_message_at) {
					known.preview = unknown.preview;
					known.last_message_at = unknown.last_message_at;
				}
				if (unknown.unread) known.unread = true;
				if (unknown.needs_review) known.needs_review = true;
				if (unknown.ai_handled) known.ai_handled = true;
				if (unknown.has_non_email) known.has_non_email = true;
				for (const a of unknown.agents || []) if (!known.agents!.includes(a)) known.agents!.push(a);
				contactMap.delete(key);
			}
		}

		const convos = Array.from(contactMap.values());
		setConversations(convos);
		setHasRealData(convos.length > 0);
		const firstShown = convos.find(isShownByDefault);
		if (firstShown && !selectedContactId) {
			setSelectedContactId(firstShown.contact_id);
		}
		setLoading(false);
	};

	// Mark all inbound messages as read for a conversation
	const markThreadAsRead = async (contactId: string) => {
		if (!user?.clientId) return;

		let query = supabase
			.from('messages')
			.update({ is_read: true })
			.eq('client_id', user.clientId)
			.eq('direction', 'inbound')
			.eq('is_read', false);

		if (contactId.startsWith('unknown_')) {
			const identifier = contactId.replace('unknown_', '');
			query = query
				.is('contact_id', null)
				.or(
					`recipient_identifier.eq.${identifier},sender_name.eq.${identifier}`,
				);
		} else {
			query = query.eq('contact_id', contactId);
		}

		const { error } = await query;
		if (error) {
			console.error('markThreadAsRead error:', error);
			return;
		}
		// Update conversation list locally
		setConversations((prev) =>
			prev.map((c) =>
				c.contact_id === contactId ? { ...c, unread: false } : c,
			),
		);
	};

	// Fetch messages for selected contact (or by sender_name for unknown contacts)
	const fetchMessages = async (contactId: string) => {
		setLoadingMessages(true);
		let query = supabase
			.from('messages')
			.select(
				'id, direction, channel, content, sender_name, sent_at, status, is_read, metadata, recipient_identifier, subject, client_id',
			)
			.order('sent_at', { ascending: true });

		if (contactId.startsWith('unknown_')) {
			const identifier = contactId.replace('unknown_', '');
			query = query
				.is('contact_id', null)
				.or(
					`recipient_identifier.eq.${identifier},sender_name.eq.${identifier}`,
				);
		} else {
			// Also fetch any unlinked messages whose recipient_identifier matches the contact's email
			const conv = conversations.find((c) => c.contact_id === contactId);
			const email = conv?.contact_email?.toLowerCase();
			if (email) {
				query = query.or(
					`contact_id.eq.${contactId},and(contact_id.is.null,recipient_identifier.eq.${email})`,
				);
			} else {
				query = query.eq('contact_id', contactId);
			}
		}

		const { data } = await query;
		setThreadMessages((data as unknown as Message[]) || []);
		setLoadingMessages(false);
	};

	useEffect(() => {
		fetchEmailStats();
	}, [channelFilter]);

	// Fetch fresh lead_score + contact info for selected conversation
	const refreshContactScore = async (contactId: string) => {
		if (!contactId || contactId.startsWith('unknown_')) return;
		const { data } = await supabase
			.from('contacts')
			.select('lead_score, status')
			.eq('id', contactId)
			.maybeSingle();
		if (data) {
			setConversations((prev) =>
				prev.map((c) =>
					c.contact_id === contactId
						? { ...c, lead_score: data.lead_score }
						: c,
				),
			);
		}
	};

	useEffect(() => {
		fetchConversations();
		const channel = supabase
			.channel('inbox-messages')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'messages' },
				() => {
					fetchConversations();
					if (selectedContactId) fetchMessages(selectedContactId);
				},
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'messages' },
				() => {
					if (selectedContactId) fetchMessages(selectedContactId);
				},
			)
			// Re-fetch lead score whenever the contacts table is updated by the agent
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'contacts' },
				(payload: any) => {
					const updatedId = payload.new?.id;
					if (updatedId) refreshContactScore(updatedId);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, []);

	useEffect(() => {
		if (selectedContactId && hasRealData) {
			fetchMessages(selectedContactId);
			refreshContactScore(selectedContactId);
		}
	}, [selectedContactId, hasRealData]);

	// Trigger lead qualification for contacts with no score
	useEffect(() => {
		if (!selectedContactId || selectedContactId.startsWith('unknown_') || !user?.clientId) return;
		const conv = conversations.find((c) => c.contact_id === selectedContactId);
		if (!conv || conv.lead_score != null) return;

		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
		const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

		setScoringContactId(selectedContactId);
		fetch(`${supabaseUrl}/functions/v1/lead-qualification-agent`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
			body: JSON.stringify({
				client_id: user.clientId,
				contact_id: selectedContactId,
				from_email: conv.contact_email,
				subject: 'Existing conversation',
				inbound_content: conv.preview,
			}),
		})
			.then(async (res) => {
				const data = await res.json();
				if (data.score != null) {
					setConversations((prev) =>
						prev.map((c) =>
							c.contact_id === selectedContactId
								? { ...c, lead_score: data.score }
								: c,
						),
					);
				} else {
					// Agent skipped (e.g. not active) — refresh from DB anyway
					await refreshContactScore(selectedContactId);
				}
			})
			.catch(() => {})
			.finally(() => setScoringContactId(null));
	}, [selectedContactId]);

	const handleAddContact = async () => {
		if (!user?.clientId || !newContactEmail) return;
		setSavingContact(true);
		const email = newContactEmail.trim().toLowerCase();
		const { data, error } = await supabase.from('contacts').insert({
			client_id: user.clientId,
			first_name: newContactFirstName.trim() || email.split('@')[0],
			last_name: newContactLastName.trim() || '',
			email,
			phone: newContactPhone.trim() || null,
			status: 'Lead',
		}).select('id').single();

		if (error) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		} else {
			// Retroactively link all existing messages from this email to the new contact
			await supabase
				.from('messages')
				.update({ contact_id: data.id })
				.eq('client_id', user.clientId)
				.is('contact_id', null)
				.or(`recipient_identifier.eq.${email},sender_name.eq.${email}`);

			toast({ title: 'Contact added', description: `${newContactFirstName || email} was added to contacts.` });
			setAddContactOpen(false);
			fetchConversations();
		}
		setSavingContact(false);
	};

	// Load contacts for compose
	const loadContacts = async () => {
		const { data } = await supabase
			.from('contacts')
			.select('id, first_name, last_name, email, phone')
			.order('first_name', { ascending: true });
		setContacts(data || []);
	};

	useEffect(() => {
		loadContacts();
	}, []);

	const filteredContacts = contacts.filter((c) => {
		if (!contactSearch) return true;
		const name = `${c.first_name} ${c.last_name}`.toLowerCase();
		return (
			name.includes(contactSearch.toLowerCase()) ||
			c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
			c.phone?.includes(contactSearch)
		);
	});

	const handleComposeSend = async () => {
		if (!selectedComposeContact || !composeBody.trim()) return;
		setComposeSending(true);
		try {
			if (composeNewChannel === 'email') {
				if (!selectedComposeContact.email) {
					toast({
						title: 'No email',
						description: 'This contact has no email on file.',
						variant: 'destructive',
					});
					setComposeSending(false);
					return;
				}
				if (!composeSubject.trim()) {
					toast({
						title: 'Subject required',
						description: 'Please enter an email subject.',
						variant: 'destructive',
					});
					setComposeSending(false);
					return;
				}
				const { data: emailRes, error } = await supabase.functions.invoke(
					'send-email',
					{
						body: {
							to: selectedComposeContact.email,
							subject: composeSubject.trim(),
							html_body: `<p>${composeBody.trim().replace(/\n/g, '<br/>')}</p>`,
							client_id: user?.clientId,
							contact_id: selectedComposeContact.id,
							sender_name: user?.fullName || 'Agent',
						},
					},
				);
				if (error) throw error;
				if (emailRes?.error) throw new Error(emailRes.error);
			} else {
				if (!selectedComposeContact.phone) {
					toast({
						title: 'No phone',
						description: 'This contact has no phone number on file.',
						variant: 'destructive',
					});
					setComposeSending(false);
					return;
				}
				const { error } = await supabase.functions.invoke('send-sms', {
					body: {
						to: selectedComposeContact.phone,
						body: composeBody.trim(),
						client_id: user?.clientId,
						contact_id: selectedComposeContact.id,
						sender_name: user?.fullName || 'Agent',
					},
				});
				if (error) throw error;
			}
			toast({
				title: 'Sent!',
				description: `${composeNewChannel === 'email' ? 'Email' : 'SMS'} sent to ${selectedComposeContact.first_name} ${selectedComposeContact.last_name}`,
			});
			setShowCompose(false);
			setSelectedComposeContact(null);
			setComposeBody('');
			setComposeSubject('');
			setContactSearch('');
			fetchConversations();
		} catch (err: any) {
			toast({
				title: 'Send failed',
				description: err.message || 'Could not send message.',
				variant: 'destructive',
			});
		} finally {
			setComposeSending(false);
		}
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [threadMessages]);

	// Send a message via the appropriate channel
	const handleSend = async () => {
		if (!message.trim() || !selectedContactId) return;
		const sel = conversations.find((c) => c.contact_id === selectedContactId);
		if (!sel) return;

		setSending(true);
		// For unknown contacts (no real UUID), pass null contact_id
		const isUnknownContact = selectedContactId.startsWith('unknown_');
		const realContactId = isUnknownContact ? null : selectedContactId;

		try {
			if (composeChannel === 'sms') {
				if (!sel.contact_phone) {
					toast({
						title: 'No phone number',
						description: 'This contact has no phone number on file.',
						variant: 'destructive',
					});
					setSending(false);
					return;
				}
				const { error } = await supabase.functions.invoke('send-sms', {
					body: {
						to: sel.contact_phone,
						body: message.trim(),
						client_id: user?.clientId,
						contact_id: realContactId,
						sender_name: user?.fullName || 'Agent',
					},
				});
				if (error) throw error;
			} else if (composeChannel === 'whatsapp') {
				if (!sel.contact_phone) {
					toast({
						title: 'No phone number',
						description: 'This contact has no phone number on file.',
						variant: 'destructive',
					});
					setSending(false);
					return;
				}
				const { data: waRes, error } = await supabase.functions.invoke('send-whatsapp', {
					body: {
						to: sel.contact_phone,
						body: message.trim(),
						client_id: user?.clientId,
						contact_id: realContactId,
						sender_name: user?.fullName || 'Agent',
					},
				});
				const waErr = await functionError(error, waRes);
				if (waErr) throw new Error(waErr);
			} else if (composeChannel === 'email') {
				if (!sel.contact_email) {
					toast({
						title: 'No email address',
						description: 'This contact has no email on file.',
						variant: 'destructive',
					});
					setSending(false);
					return;
				}
				if (!emailSubject.trim()) {
					toast({
						title: 'Subject required',
						description: 'Please enter an email subject.',
						variant: 'destructive',
					});
					setSending(false);
					return;
				}
				const { data: emailRes, error } = await supabase.functions.invoke(
					'send-email',
					{
						body: {
							to: sel.contact_email,
							subject: emailSubject.trim(),
							html_body: `<p>${message.trim().replace(/\n/g, '<br/>')}</p>`,
							client_id: user?.clientId,
							contact_id: realContactId,
							sender_name: user?.fullName || 'Agent',
						},
					},
				);
				if (error) throw error;
				if (emailRes?.error) throw new Error(emailRes.error);
			} else {
				// Note — just save locally
				await supabase.from('messages').insert({
					client_id: user?.clientId,
					contact_id: realContactId,
					direction: 'outbound',
					channel: 'Chat',
					content: message.trim(),
					sender_name: user?.fullName || 'Agent',
					status: 'sent',
				});
			}
			setMessage('');
			setEmailSubject('');
			fetchMessages(selectedContactId);
			fetchConversations();
		} catch (err: any) {
			toast({
				title: 'Send failed',
				description: err.message || 'Could not send message.',
				variant: 'destructive',
			});
		} finally {
			setSending(false);
		}
	};

	// ── Fallback to mock data if no real conversations exist ──
	if (!hasRealData && !loading) {
		const selected = mockConversations.find((c) => c.id === '1');
		return (
			<div className="flex h-[calc(100vh-8rem)] -m-4 lg:-m-6">
				<div className="w-[280px] lg:w-[320px] border-r flex flex-col bg-card flex-shrink-0">
					<div className="p-3 border-b space-y-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Search conversations..."
								className="pl-9 h-9"
							/>
						</div>
						<div className="flex gap-1 flex-wrap">
							{channels.map((ch) => (
								<button
									key={ch}
									className={cn(
										'px-2.5 py-1 text-xs rounded-full font-medium transition-colors',
										ch === 'All'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground hover:bg-accent',
									)}
								>
									{ch}
								</button>
							))}
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{mockConversations.map((c) => (
							<button
								key={c.id}
								className={cn(
									'w-full px-3 py-3 flex gap-3 text-left transition-colors border-l-2',
									c.id === '1'
										? 'bg-accent border-l-primary'
										: 'border-l-transparent hover:bg-muted/50',
								)}
							>
								<div
									className={cn(
										'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
										c.unread
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground',
									)}
								>
									{c.avatar}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-center">
										<span
											className={cn(
												'text-sm truncate',
												c.unread ? 'font-semibold' : '',
											)}
										>
											{c.contactName}
										</span>
										<span className="text-xs text-muted-foreground flex-shrink-0">
											{c.timeAgo}
										</span>
									</div>
									<span className="text-xs text-muted-foreground truncate block">
										{c.preview}
									</span>
									<span className="text-[10px] text-muted-foreground">
										{c.channel}
									</span>
								</div>
								{c.unread && (
									<span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
								)}
							</button>
						))}
					</div>
				</div>
				<div className="flex-1 min-w-0 flex flex-col bg-background">
					<div className="h-14 border-b px-4 flex items-center justify-between bg-card">
						<div>
							<span className="font-semibold text-foreground">
								{selected?.contactName}
							</span>
							<span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
								{selected?.channel}
							</span>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
							>
								Assign
							</Button>
							<Button
								variant="outline"
								size="sm"
							>
								Resolve
							</Button>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{mockMessages.map((m) => (
							<motion.div
								key={m.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex gap-3 max-w-[80%]"
							>
								<div
									className={cn(
										'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
										m.sender === 'bot'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground',
									)}
								>
									{m.sender === 'bot' ? (
										<Bot className="w-4 h-4" />
									) : (
										<User className="w-4 h-4" />
									)}
								</div>
								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-xs font-medium text-foreground">
											{m.senderName}
										</span>
										<span className="text-[10px] text-muted-foreground">
											{m.time}
										</span>
									</div>
									<div className="px-3 py-2 rounded-lg text-sm bg-muted break-words [overflow-wrap:anywhere]">
										{m.sender === 'bot' && (
											<span className="text-xs text-primary mr-1">🤖</span>
										)}
										{stripHtml(m.content)}
									</div>
								</div>
							</motion.div>
						))}
					</div>
					<div className="p-4 border-t bg-card">
						<div className="flex gap-2">
							<Input
								placeholder="Type a message..."
								className="flex-1"
							/>
							<Button size="icon">
								<Send className="w-4 h-4" />
							</Button>
						</div>
						<div className="flex items-center gap-2 mt-2">
							{['SMS', 'Email', 'Note'].map((t) => (
								<button
									key={t}
									className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-accent"
								>
									{t}
								</button>
							))}
							<div className="flex-1" />
							<button className="text-muted-foreground hover:text-foreground">
								<Smile className="w-4 h-4" />
							</button>
							<button className="text-muted-foreground hover:text-foreground">
								<Paperclip className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
				<div className="hidden xl:block w-[280px] border-l bg-card p-4 overflow-y-auto flex-shrink-0">
					<div className="space-y-4">
						<div className="text-center">
							<div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
								SJ
							</div>
							<h3 className="font-semibold text-foreground mt-3">
								Sarah Johnson
							</h3>
							<p className="text-xs text-muted-foreground">Lead Score: 72</p>
						</div>
						<div className="space-y-2 text-sm">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Phone className="w-3 h-3" /> (555) 234-5678
							</div>
							<div className="flex items-center gap-2 text-muted-foreground">
								<Mail className="w-3 h-3" /> sarah@email.com
							</div>
							<div className="flex items-center gap-2 text-muted-foreground">
								<Tag className="w-3 h-3" /> new-lead, dental
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2 text-center">
							{[
								{ l: 'Messages', v: '3' },
								{ l: 'Apts', v: '1' },
								{ l: 'Invoices', v: '0' },
								{ l: 'Reviews', v: '0' },
							].map((s) => (
								<div
									key={s.l}
									className="bg-muted rounded-lg p-2"
								>
									<div className="text-sm font-semibold text-foreground">
										{s.v}
									</div>
									<div className="text-[10px] text-muted-foreground">{s.l}</div>
								</div>
							))}
						</div>
						<div className="space-y-2">
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setBookOpen(true)}>
								<Calendar className="w-3.5 h-3.5" />Book Appointment
							</Button>
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setDealOpen(true)}>
								<Briefcase className="w-3.5 h-3.5" />Create Deal
							</Button>
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setInvoiceOpen(true)}>
								<Receipt className="w-3.5 h-3.5" />Send Invoice
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// ── Real data view ──
	const selected = conversations.find(
		(c) => c.contact_id === selectedContactId,
	);
	// Create Deal starts with this conversation's contact, or offers to add an unknown sender as one.
	const dealDefaults: AddDealDefaults | undefined = !selected
		? undefined
		: !selected.contact_id.startsWith('unknown_')
			? { contactId: selected.contact_id }
			: (() => {
				const id = selected.contact_id.replace('unknown_', '');
				const email = id.includes('@') ? id : '';
				const name = selected.contact_name.includes('@') ? '' : selected.contact_name;
				return { newContact: { name, email } };
			})();
	// Approve an assistant-drafted reply: send it, then clear the draft/flag.
	const approveDraft = async (m: Message) => {
		const md = m.metadata;
		if (!md?.draft_reply || !m.recipient_identifier) return;
		setApprovingId(m.id);
		try {
			if (md.draft_channel === 'WhatsApp') {
				const { data: waRes, error } = await supabase.functions.invoke('send-whatsapp', {
					body: {
						to: m.recipient_identifier,
						body: md.draft_reply,
						client_id: m.client_id || user?.clientId,
						sender_name: md.draft_sender_name || 'Assistant',
						channel_account_id: md.draft_channel_account_id || null,
						metadata: { agent: 'personal_assistant', approved_draft: true },
					},
				});
				const waErr = await functionError(error, waRes);
				if (waErr) throw new Error(waErr);
				await supabase.from('messages')
					.update({ metadata: { ...md, needs_review: false, draft_reply: null } })
					.eq('id', m.id);
				toast({ title: 'Reply sent', description: 'Your assistant\'s draft was approved and sent on WhatsApp.' });
				fetchMessages(selectedContactId);
				fetchConversations();
				return;
			}
			const { data: emailRes, error } = await supabase.functions.invoke('send-email', {
				body: {
					to: m.recipient_identifier,
					subject: md.draft_subject || `Re: ${m.subject || 'Your email'}`,
					html_body: `<p>${md.draft_reply.replace(/\n/g, '<br/>')}</p>`,
					client_id: m.client_id || user?.clientId,
					sender_name: md.draft_sender_name || 'Assistant',
					channel_account_id: md.draft_channel_account_id || null,
				},
			});
			if (error) throw error;
			if (emailRes?.error) throw new Error(emailRes.error);
			await supabase.from('messages')
				.update({ metadata: { ...md, needs_review: false, draft_reply: null } })
				.eq('id', m.id);
			toast({ title: 'Reply sent', description: 'Your assistant\'s draft was approved and sent.' });
			fetchMessages(selectedContactId);
			fetchConversations();
		} catch (err: any) {
			toast({ title: 'Send failed', description: err.message || 'Could not send the reply.', variant: 'destructive' });
		} finally {
			setApprovingId(null);
		}
	};

	// Discard a drafted reply without sending.
	const dismissDraft = async (m: Message) => {
		await supabase.from('messages')
			.update({ metadata: { ...(m.metadata || {}), needs_review: false, draft_reply: null } })
			.eq('id', m.id);
		fetchMessages(selectedContactId);
		fetchConversations();
	};

	const reviewCount = conversations.filter((c) => c.needs_review).length;
	// Display name for an agent group: the name the owner gave it, else a default.
	const agentLabel = (key: string) => agentNames[key] || (key === 'aria' ? agentNames.lead_capture || 'Aria' : AGENT_LABEL[key] || key);
	const agentCounts = Object.entries(
		conversations.reduce<Record<string, number>>((acc, c) => {
			for (const a of c.agents || []) acc[a] = (acc[a] || 0) + 1;
			return acc;
		}, {}),
	).sort((a, b) => b[1] - a[1]);
	const otherEmailCount = conversations.filter((c) => !isShownByDefault(c)).length;
	const filteredConversations = conversations.filter((c) => {
		// Default list: AI-handled email plus SMS/Chat. "Other email" shows the rest.
		if (showOtherEmail === isShownByDefault(c)) return false;
		if (channelFilter !== 'All' && c.channel !== channelFilter) return false;
		if (needsReviewOnly && !c.needs_review) return false;
		if (agentFilter && !(c.agents || []).includes(agentFilter)) return false;
		if (search && !c.contact_name.toLowerCase().includes(search.toLowerCase()))
			return false;
		return true;
	});

	return (
		<>
		<div className="flex h-[calc(100vh-8rem)] -m-4 lg:-m-6">
			{/* Compose New Message Modal */}
			{showCompose && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
						<div className="flex items-center justify-between p-4 border-b">
							<h3 className="font-semibold text-foreground">New Message</h3>
							<button
								onClick={() => {
									setShowCompose(false);
									setSelectedComposeContact(null);
									setContactSearch('');
									setComposeBody('');
									setComposeSubject('');
								}}
							>
								<X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
							</button>
						</div>
						<div className="p-4 space-y-3 flex-1 overflow-y-auto">
							{/* Channel selector */}
							<div className="flex gap-2">
								{(['email', 'sms'] as const).map((ch) => (
									<button
										key={ch}
										onClick={() => setComposeNewChannel(ch)}
										className={cn(
											'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
											composeNewChannel === ch
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-muted-foreground hover:bg-accent',
										)}
									>
										{ch === 'email' ? (
											<Mail className="w-3 h-3" />
										) : (
											<MessageSquare className="w-3 h-3" />
										)}
										{ch === 'email' ? 'Email' : 'SMS'}
									</button>
								))}
							</div>
							{/* Contact selector */}
							{!selectedComposeContact ? (
								<div>
									<Input
										placeholder="Search contacts..."
										value={contactSearch}
										onChange={(e) => setContactSearch(e.target.value)}
										className="h-9 mb-2"
									/>
									<div className="max-h-48 overflow-y-auto border rounded-md">
										{filteredContacts.length === 0 ? (
											<div className="p-3 text-sm text-muted-foreground text-center">
												No contacts found
											</div>
										) : (
											filteredContacts.map((c) => (
												<button
													key={c.id}
													onClick={() => {
														setSelectedComposeContact(c);
														setContactSearch('');
													}}
													className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
												>
													<div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
														{getInitials(`${c.first_name} ${c.last_name}`)}
													</div>
													<div className="flex-1 min-w-0">
														<div className="text-sm font-medium text-foreground">
															{c.first_name} {c.last_name}
														</div>
														<div className="text-xs text-muted-foreground truncate">
															{composeNewChannel === 'email'
																? c.email || 'No email'
																: c.phone || 'No phone'}
														</div>
													</div>
												</button>
											))
										)}
									</div>
								</div>
							) : (
								<div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
									<span className="text-sm font-medium flex-1">
										To: {selectedComposeContact.first_name}{' '}
										{selectedComposeContact.last_name}
										<span className="text-muted-foreground ml-2 font-normal">
											(
											{composeNewChannel === 'email'
												? selectedComposeContact.email
												: selectedComposeContact.phone}
											)
										</span>
									</span>
									<button onClick={() => setSelectedComposeContact(null)}>
										<X className="w-3 h-3 text-muted-foreground" />
									</button>
								</div>
							)}
							{/* Subject (email only) */}
							{composeNewChannel === 'email' && (
								<Input
									placeholder="Subject..."
									value={composeSubject}
									onChange={(e) => setComposeSubject(e.target.value)}
									className="h-9"
								/>
							)}
							{/* Body */}
							<Textarea
								placeholder={
									composeNewChannel === 'email'
										? 'Write your email...'
										: 'Type SMS message...'
								}
								value={composeBody}
								onChange={(e) => setComposeBody(e.target.value)}
								rows={composeNewChannel === 'email' ? 6 : 3}
								className="resize-none text-sm"
							/>
							{composeNewChannel === 'sms' && (
								<div
									className={cn(
										'text-xs text-right',
										composeBody.length > 160
											? 'text-destructive'
											: 'text-muted-foreground',
									)}
								>
									{composeBody.length}/160
								</div>
							)}
						</div>
						<div className="p-4 border-t flex justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setShowCompose(false);
									setSelectedComposeContact(null);
									setComposeBody('');
									setComposeSubject('');
									setContactSearch('');
								}}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleComposeSend}
								disabled={
									composeSending ||
									!selectedComposeContact ||
									!composeBody.trim()
								}
							>
								{composeSending ? (
									<Loader2 className="w-4 h-4 animate-spin mr-1" />
								) : (
									<Send className="w-4 h-4 mr-1" />
								)}
								Send {composeNewChannel === 'email' ? 'Email' : 'SMS'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Conversation List */}
			<div className="w-[280px] lg:w-[320px] border-r flex flex-col bg-card flex-shrink-0">
				<div className="p-3 border-b space-y-2">
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Search conversations..."
								className="pl-9 h-9"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<Button
							size="icon"
							variant="outline"
							className="h-9 w-9 flex-shrink-0"
							onClick={() => setShowCompose(true)}
							title="New message"
						>
							<Plus className="w-4 h-4" />
						</Button>
					</div>
					<div className="flex gap-1 flex-wrap">
						{channels.map((ch) => (
							<button
								key={ch}
								onClick={() => setChannelFilter(ch)}
								className={cn(
									'px-2.5 py-1 text-xs rounded-full font-medium transition-colors',
									channelFilter === ch
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground hover:bg-accent',
								)}
							>
								{ch}
							</button>
						))}
						{reviewCount > 0 && (
							<button
								onClick={() => setNeedsReviewOnly((v) => !v)}
								title="Show only conversations Aria flagged for human review"
								className={cn(
									'px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1',
									needsReviewOnly
										? 'bg-amber-500 text-white'
										: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
								)}
							>
								<AlertTriangle className="w-3 h-3" />
								Needs review ({reviewCount})
							</button>
						)}
						{agentCounts.map(([key, count]) => (
							<button
								key={key}
								onClick={() => setAgentFilter((v) => (v === key ? null : key))}
								title={`Conversations ${agentLabel(key)} has emailed`}
								className={cn(
									'px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1',
									agentFilter === key
										? 'bg-primary text-primary-foreground'
										: 'bg-primary/10 text-primary hover:bg-primary/20',
								)}
							>
								<Bot className="w-3 h-3" />
								{agentLabel(key)} ({count})
							</button>
						))}
						{otherEmailCount > 0 && (
							<button
								onClick={() => setShowOtherEmail((v) => !v)}
								title="Emails your AI agents didn't answer, like newsletters and notifications"
								className={cn(
									'px-2.5 py-1 text-xs rounded-full font-medium transition-colors',
									showOtherEmail
										? 'bg-foreground text-background'
										: 'bg-muted text-muted-foreground hover:bg-muted/80',
								)}
							>
								Other email ({otherEmailCount})
							</button>
						)}
					</div>
					{/* Email Stats Bar */}
					{(channelFilter === 'Email' || channelFilter === 'All') &&
						Object.keys(emailStats).length > 0 && (
							<div className="flex gap-3 flex-wrap mt-2 px-1">
								{[
									{
										key: 'sent',
										label: 'Sent',
										color: 'text-muted-foreground',
									},
									{
										key: 'delivered',
										label: 'Delivered',
										color: 'text-emerald-500',
									},
									{ key: 'opened', label: 'Opened', color: 'text-blue-500' },
									{
										key: 'clicked',
										label: 'Clicked',
										color: 'text-ember-500',
									},
									{
										key: 'bounced',
										label: 'Bounced',
										color: 'text-destructive',
									},
									{ key: 'failed', label: 'Failed', color: 'text-destructive' },
								]
									.filter((s) => emailStats[s.key])
									.map((s) => (
										<div
											key={s.key}
											className="flex items-center gap-1"
										>
											<span
												className={cn(
													'text-[11px] font-semibold tabular-nums',
													s.color,
												)}
											>
												{emailStats[s.key]}
											</span>
											<span className="text-[10px] text-muted-foreground">
												{s.label}
											</span>
										</div>
									))}
							</div>
						)}
				</div>
				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							Loading...
						</div>
					) : filteredConversations.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							No conversations
						</div>
					) : (
						filteredConversations.map((c) => (
							<button
								key={c.contact_id}
								onClick={() => {
									setSelectedContactId(c.contact_id);
									if (c.unread) markThreadAsRead(c.contact_id);
								}}
								className={cn(
									'w-full px-3 py-3 flex gap-3 text-left transition-colors border-l-2',
									selectedContactId === c.contact_id
										? 'bg-accent border-l-primary'
										: 'border-l-transparent hover:bg-muted/50',
								)}
							>
								<div
									className={cn(
										'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
										c.unread
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground',
									)}
								>
									{c.avatar}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-center">
										<span
											className={cn(
												'text-sm truncate text-foreground',
												c.unread && 'font-semibold',
											)}
										>
											{c.contact_name}
										</span>
										<span className="text-xs text-muted-foreground flex-shrink-0">
											{timeAgo(c.last_message_at)}
										</span>
									</div>
									<span
										className={cn(
											'text-xs truncate block',
											c.unread
												? 'text-foreground font-medium'
												: 'text-muted-foreground',
										)}
									>
										{c.preview}
									</span>
									<span className="text-[10px] text-muted-foreground">
										{c.channel}
										{(c.agents || []).length > 0 && (
											<span className="ml-1.5 text-primary font-medium">· {(c.agents || []).map(agentLabel).join(', ')}</span>
										)}
									</span>
								</div>
								{c.needs_review && (
									<AlertTriangle
										className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-1.5"
										aria-label="Needs review"
									/>
								)}
								{c.unread && (
									<span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
								)}
							</button>
						))
					)}
				</div>
			</div>

			{/* Thread */}
			<div className="flex-1 min-w-0 flex flex-col bg-background">
				{selected ? (
					<>
						<div className="h-14 border-b px-4 flex items-center justify-between bg-card">
							<div>
								<span className="font-semibold text-foreground">
									{selected.contact_name}
								</span>
								<span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
									{selected.channel}
								</span>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
								>
									Assign
								</Button>
								<Button
									variant="outline"
									size="sm"
								>
									Resolve
								</Button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{loadingMessages ? (
								<div className="text-center text-sm text-muted-foreground py-8">
									Loading messages...
								</div>
							) : threadMessages.length === 0 ? (
								<div className="text-center text-sm text-muted-foreground py-8">
									No messages yet
								</div>
							) : (
								threadMessages.map((m) => (
									<motion.div
										key={m.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex gap-3 max-w-[80%]"
									>
										<div
											className={cn(
												'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
												m.direction === 'outbound'
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground',
											)}
										>
											{m.direction === 'outbound' ? (
												<Bot className="w-4 h-4" />
											) : (
												<User className="w-4 h-4" />
											)}
										</div>
										<div>
											<div className="flex items-center gap-2 mb-1">
												<span className="text-xs font-medium text-foreground">
													{m.direction === 'outbound'
														? m.sender_name || BRAND.name
														: selected.contact_name}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{timeAgo(m.sent_at)}
												</span>
											</div>
											<div className="px-3 py-2 rounded-lg text-sm bg-muted break-words [overflow-wrap:anywhere]">
												{m.direction === 'outbound' && (
													<span className="text-xs text-primary mr-1">🤖</span>
												)}
												{stripHtml(m.content)}
											</div>
											{m.metadata?.needs_review && (
												<div
													className="flex items-center gap-1 mt-0.5 text-[10px] text-amber-600"
													title={m.metadata.flag_note || 'Flagged for human review'}
												>
													<AlertTriangle className="w-3 h-3" />
													<span>Needs review</span>
												</div>
											)}
											{m.metadata?.needs_review && m.metadata?.draft_reply && (
												<div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2.5 max-w-[520px]">
													<div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-amber-700">
														<Bot className="w-3 h-3" />
														<span>Suggested reply{m.metadata.draft_sender_name ? ` from ${m.metadata.draft_sender_name}` : ''}</span>
													</div>
													<div className="text-xs text-foreground whitespace-pre-wrap">
														{m.metadata.draft_reply}
													</div>
													<div className="flex gap-2 mt-2">
														<Button
															size="sm"
															className="h-7 text-xs"
															disabled={approvingId === m.id}
															onClick={() => approveDraft(m)}
														>
															{approvingId === m.id ? 'Sending…' : 'Approve & send'}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="h-7 text-xs"
															disabled={approvingId === m.id}
															onClick={() => dismissDraft(m)}
														>
															Dismiss
														</Button>
													</div>
												</div>
											)}
											{m.direction === 'outbound' &&
												m.channel === 'Email' &&
												m.status &&
												STATUS_CONFIG[m.status] && (
													<div
														className={cn(
															'flex items-center gap-1 mt-0.5 text-[10px]',
															STATUS_CONFIG[m.status].className,
														)}
													>
														{STATUS_CONFIG[m.status].icon}
														<span>{STATUS_CONFIG[m.status].label}</span>
													</div>
												)}
										</div>
									</motion.div>
								))
							)}
							<div ref={messagesEndRef} />
						</div>
						<div className="p-4 border-t bg-card space-y-2">
							{/* Channel selector */}
							<div className="flex items-center gap-2">
								{[
									{
										key: 'sms' as ComposeChannel,
										label: 'SMS',
										icon: <MessageSquare className="w-3 h-3 mr-1" />,
									},
									{
										key: 'whatsapp' as ComposeChannel,
										label: 'WhatsApp',
										icon: <MessageCircle className="w-3 h-3 mr-1" />,
									},
									{
										key: 'email' as ComposeChannel,
										label: 'Email',
										icon: <Mail className="w-3 h-3 mr-1" />,
									},
									{
										key: 'note' as ComposeChannel,
										label: 'Note',
										icon: <Tag className="w-3 h-3 mr-1" />,
									},
								].map((ch) => (
									<button
										key={ch.key}
										onClick={() => setComposeChannel(ch.key)}
										className={cn(
											'flex items-center text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors',
											composeChannel === ch.key
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-muted-foreground hover:bg-accent',
										)}
									>
										{ch.icon}
										{ch.label}
									</button>
								))}
								<div className="flex-1" />
								{composeChannel === 'sms' && (
									<span
										className={cn(
											'text-xs',
											message.length > 160
												? 'text-destructive font-medium'
												: 'text-muted-foreground',
										)}
									>
										{message.length}/160
									</span>
								)}
							</div>
							{/* Email subject line */}
							{composeChannel === 'email' && (
								<Input
									placeholder="Subject..."
									value={emailSubject}
									onChange={(e) => setEmailSubject(e.target.value)}
									className="h-8 text-sm"
								/>
							)}
							{/* Message input */}
							<div className="flex gap-2">
								{composeChannel === 'email' ? (
									<Textarea
										placeholder="Write your email..."
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										rows={3}
										className="flex-1 text-sm resize-none"
									/>
								) : (
									<Input
										placeholder={
											composeChannel === 'sms'
												? 'Type SMS message...'
												: 'Add a note...'
										}
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault();
												handleSend();
											}
										}}
										className="flex-1"
									/>
								)}
								<Button
									size="icon"
									onClick={handleSend}
									disabled={sending || !message.trim()}
								>
									{sending ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Send className="w-4 h-4" />
									)}
								</Button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
						{loading ? 'Loading...' : 'Select a conversation'}
					</div>
				)}
			</div>

			{/* Contact Panel */}
			<div className="hidden xl:block w-[280px] border-l bg-card p-4 overflow-y-auto flex-shrink-0">
				{selected && (
					<div className="space-y-4">
						<div className="text-center">
							<div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
								{selected.avatar}
							</div>
							<h3 className="font-semibold text-foreground mt-3">
								{selected.contact_name}
							</h3>
							{scoringContactId === selected.contact_id ? (
								<p className="text-xs text-muted-foreground mt-1 animate-pulse">Scoring lead…</p>
							) : selected.lead_score != null ? (
								<div className="flex items-center justify-center gap-1.5 mt-1">
									<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
										selected.lead_score >= 70
											? 'bg-green-100 text-green-700'
											: selected.lead_score >= 40
											? 'bg-yellow-100 text-yellow-700'
											: 'bg-red-100 text-red-600'
									}`}>
										{selected.lead_score >= 70 ? 'Qualified' : selected.lead_score >= 40 ? 'Prospect' : 'Lead'}
									</span>
									<span className="text-xs text-muted-foreground">{selected.lead_score}/100</span>
								</div>
							) : null}
						</div>
						<div className="space-y-2 text-sm">
							{selected.contact_phone && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Phone className="w-3 h-3" /> {selected.contact_phone}
								</div>
							)}
							{selected.contact_email && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Mail className="w-3 h-3" /> {selected.contact_email}
								</div>
							)}
							{selected.tags && selected.tags.length > 0 && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Tag className="w-3 h-3" /> {selected.tags.join(', ')}
								</div>
							)}
						</div>
						<div className="grid grid-cols-2 gap-2 text-center">
							{[
								{ l: 'Messages', v: threadMessages.length.toString() },
								{ l: 'Apts', v: '0' },
								{ l: 'Invoices', v: '0' },
								{ l: 'Reviews', v: '0' },
							].map((s) => (
								<div
									key={s.l}
									className="bg-muted rounded-lg p-2"
								>
									<div className="text-sm font-semibold text-foreground">
										{s.v}
									</div>
									<div className="text-[10px] text-muted-foreground">{s.l}</div>
								</div>
							))}
						</div>
						<div className="space-y-2">
							{selected.contact_id.startsWith('unknown_') && (
								<Button
									size="sm"
									className="w-full gap-2"
									onClick={() => {
										const identifier = selected.contact_id.replace('unknown_', '');
										const isEmail = identifier.includes('@');
										setNewContactEmail(isEmail ? identifier : '');
										setNewContactPhone(isEmail ? '' : identifier);
										const nameParts = selected.contact_name !== identifier ? selected.contact_name.split(' ') : [];
										setNewContactFirstName(nameParts[0] || '');
										setNewContactLastName(nameParts.slice(1).join(' '));
										setAddContactOpen(true);
									}}
								>
									<UserPlus className="w-3.5 h-3.5" />Add as Contact
								</Button>
							)}
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setBookOpen(true)}>
								<Calendar className="w-3.5 h-3.5" />Book Appointment
							</Button>
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setDealOpen(true)}>
								<Briefcase className="w-3.5 h-3.5" />Create Deal
							</Button>
							<Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setInvoiceOpen(true)}>
								<Receipt className="w-3.5 h-3.5" />Send Invoice
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
		<>
		{/* ── Book Appointment Dialog ── */}
		<Dialog open={bookOpen} onOpenChange={setBookOpen}>
			<DialogContent className={cn('z-[60]', calUrl && getCalEmbedUrl(calUrl) ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" />Book Appointment</DialogTitle>
				</DialogHeader>
				{calUrl && getCalEmbedUrl(calUrl) ? (
					<div className="w-full" style={{ height: 500 }}>
						<iframe src={getCalEmbedUrl(calUrl)} className="w-full h-full border-0 rounded-lg" title="Cal.com Booking" allow="camera; microphone" />
					</div>
				) : (
					<>
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs text-muted-foreground">Date</Label>
									<Input type="date" value={aptDate} onChange={e => setAptDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="mt-1" />
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Time</Label>
									<Input type="time" value={aptTime} onChange={e => setAptTime(e.target.value)} className="mt-1" />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs text-muted-foreground">Service</Label>
									<Input value={aptService} onChange={e => setAptService(e.target.value)} placeholder="e.g. Consultation" className="mt-1" />
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Duration</Label>
									<Select value={aptDuration} onValueChange={setAptDuration}>
										<SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
										<SelectContent>
											{['15', '30', '45', '60', '90'].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div>
								<Label className="text-xs text-muted-foreground">Notes</Label>
								<Textarea value={aptNotes} onChange={e => setAptNotes(e.target.value)} placeholder="Optional notes..." className="mt-1 resize-none" rows={2} />
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
							<Button onClick={handleBookAppointment} disabled={booking} className="gap-1.5">
								{booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
								{booking ? 'Booking...' : 'Book Appointment'}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>

		{/* ── Create Deal Dialog (same as the Pipeline's) ── */}
		<AddDealDialog
			open={dealOpen}
			onOpenChange={setDealOpen}
			defaults={dealDefaults}
		/>

		<CreateInvoiceDialog
			open={invoiceOpen}
			onOpenChange={setInvoiceOpen}
			contactId={conversations.find((c) => c.contact_id === selectedContactId)?.contact_id || null}
		/>
		</>

		{/* ── Add as Contact Dialog ── */}
		<Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
			<DialogContent className="sm:max-w-md z-[60]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="w-4 h-4" />Add as Contact
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label className="text-xs text-muted-foreground">First Name</Label>
							<Input value={newContactFirstName} onChange={e => setNewContactFirstName(e.target.value)} placeholder="First" className="mt-1" />
						</div>
						<div>
							<Label className="text-xs text-muted-foreground">Last Name</Label>
							<Input value={newContactLastName} onChange={e => setNewContactLastName(e.target.value)} placeholder="Last" className="mt-1" />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Email</Label>
						<Input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="email@example.com" className="mt-1" />
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Phone</Label>
						<Input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1" />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancel</Button>
					<Button onClick={handleAddContact} disabled={savingContact || !newContactEmail}>
						{savingContact ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
						Save Contact
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
};

export default Inbox;
