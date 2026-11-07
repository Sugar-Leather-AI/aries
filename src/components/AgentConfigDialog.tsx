import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
	Globe,
	Loader2,
	FileText,
	ExternalLink,
	Copy,
	Save,
	Clock,
	Mail,
	Bell,
	Play,
	CheckCircle2,
	Target,
	Zap,
	TrendingUp,
	Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TIMEZONE_OPTIONS, tzOffsetHours } from '@/lib/timezones';
import { useAuth } from '@/contexts/AuthContext';
import { BRAND } from "@/brand";
import SignalPackPicker from '@/components/SignalPackPicker';

interface AgentConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agent: {
		id: string;
		name: string;
		icon: string;
		category: string;
		active: boolean;
		description: string;
	};
}

const AgentConfigDialog = ({
	open,
	onOpenChange,
	agent,
}: AgentConfigDialogProps) => {
	const { user } = useAuth();
	const [website, setWebsite] = useState('');
	const [scraping, setScraping] = useState(false);
	const [knowledgePages, setKnowledgePages] = useState<
		{ page_url: string; page_title: string }[]
	>([]);
	const [greeting, setGreeting] = useState(
		'Hi there! 👋 How can I help you today?',
	);
	const [botName, setBotName] = useState(BRAND.name);
	const [collectPhone, setCollectPhone] = useState(true);
	const [widgetSnippet, setWidgetSnippet] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Agent type flags — must be declared before any useEffect that uses them
	const isLeadCapture = agent.name.toLowerCase().includes('lead capture');
	const isLeadQualification = agent.name
		.toLowerCase()
		.includes('lead qualification');
	const isAppointmentReminder = agent.name
		.toLowerCase()
		.includes('appointment reminder');
	const isEmailSales = agent.name.toLowerCase().includes('aria') || agent.name.toLowerCase().includes('email sales');
	const isEmailReceptionist = agent.name.toLowerCase().includes('receptionist');
	const isPaymentReminder = agent.name
		.toLowerCase()
		.includes('payment reminder');
	const isUpsell = agent.name.toLowerCase().includes('upsell');
	const isProspector = agent.name.toLowerCase().includes('prospector');

	useEffect(() => {
		if (open && user?.clientId) {
			loadConfig();
		}
	}, [open, user?.clientId]);

	const loadConfig = async () => {
		setLoading(true);
		try {
			// Load client website
			const { data: client } = await supabase
				.from('clients')
				.select('website, business_name')
				.eq('id', user!.clientId!)
				.single();
			if (client) {
				setWebsite((client as any).website || '');
			}

			// Load existing knowledge pages
			const { data: pages } = await supabase
				.from('company_knowledge' as any)
				.select('page_url, page_title')
				.eq('client_id', user!.clientId!);
			if (pages) {
				setKnowledgePages(pages as any[]);
			}

			// Load saved bot config from agents table
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'lead_capture')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (cfg.bot_name) setBotName(cfg.bot_name);
				if (cfg.greeting) setGreeting(cfg.greeting);
				if (typeof cfg.collect_phone === 'boolean')
					setCollectPhone(cfg.collect_phone);
			}

			// Build widget snippet
			const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
			setWidgetSnippet(
				`<script src="${supabaseUrl}/functions/v1/lead-capture-widget?client_id=${user!.clientId}"></script>`,
			);
		} catch (e) {
			console.error('Failed to load config:', e);
		} finally {
			setLoading(false);
		}
	};

	const saveConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				bot_name: botName,
				greeting,
				collect_phone: collectPhone,
			};

			// Upsert agent row for lead_capture
			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'lead_capture')
				.maybeSingle();

			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Lead Capture + Instant Response',
					agent_type: 'lead_capture',
					category: 'Lead Gen',
					active: true,
					description: agent.description,
					config,
				} as any);
			}

			// Also save website to clients table if changed
			if (website.trim()) {
				await supabase
					.from('clients')
					.update({ website: website.trim() } as any)
					.eq('id', user.clientId);
			}

			toast.success('Configuration saved!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	const handleScrape = async () => {
		if (!website.trim() || !user?.clientId) return;
		setScraping(true);
		try {
			// Start async scrape
			const { data: startData, error: startError } =
				await supabase.functions.invoke('scrape-website', {
					body: { website: website.trim(), client_id: user.clientId },
				});
			if (startError) throw startError;
			const runId = startData.runId;
			if (!runId) throw new Error('Failed to start scrape');

			// Poll for completion
			let attempts = 0;
			const maxAttempts = 60;
			while (attempts < maxAttempts) {
				await new Promise((r) => setTimeout(r, 5000));
				attempts++;
				const { data: pollData, error: pollError } =
					await supabase.functions.invoke('scrape-website', {
						body: { runId, client_id: user.clientId },
					});
				if (pollError) throw pollError;
				if (pollData.status === 'done') {
					toast.success(`Scraped ${pollData.pages_scraped} pages!`);
					setKnowledgePages(pollData.pages || []);
					return;
				}
				if (pollData.status === 'failed') {
					throw new Error(pollData.error || 'Scrape failed');
				}
			}
			throw new Error('Scrape timed out — please try again');
		} catch (e: any) {
			toast.error(e.message || 'Scraping failed');
		} finally {
			setScraping(false);
		}
	};

	const copySnippet = () => {
		navigator.clipboard.writeText(widgetSnippet);
		toast.success('Widget code copied to clipboard!');
	};

	// Appointment Reminder states
	const [enable24h, setEnable24h] = useState(true);
	const [enable1h, setEnable1h] = useState(true);
	const [enable48h, setEnable48h] = useState(false);
	const [reminderFromName, setReminderFromName] = useState('');
	const [reminderSubject, setReminderSubject] = useState(
		'Reminder: Your appointment is {{time_label}}',
	);
	const [reminderMessage, setReminderMessage] = useState(
		'Hi {{first_name}}, this is a friendly reminder that your {{service}} appointment is {{time_label}} on {{date}} at {{time}}. If you need to reschedule, please reply to this email.',
	);
	const [testingReminder, setTestingReminder] = useState(false);
	const [reminderStats, setReminderStats] = useState<{
		total_sent: number;
		upcoming: number;
	} | null>(null);
	const [reminderChannelId, setReminderChannelId] = useState('');
	const [reminderEmailChannels, setReminderEmailChannels] = useState<
		{ id: string; identifier: string; provider: string }[]
	>([]);

	// Aria agent states
	const [esPersonaName, setEsPersonaName] = useState('');
	const [esTone, setEsTone] = useState('warm and professional');
	const [esCustomInstructions, setEsCustomInstructions] = useState('');
	const [esSignature, setEsSignature] = useState('');
	const [esAutoReply, setEsAutoReply] = useState(true);
	const [esRateLimit, setEsRateLimit] = useState(5);
	const [esBlockedDomains, setEsBlockedDomains] = useState('');
	const [esKnowledgePages, setEsKnowledgePages] = useState<
		{ page_url: string; page_title: string }[]
	>([]);
	const [esSelectedChannelId, setEsSelectedChannelId] = useState('');
	const [esTimezone, setEsTimezone] = useState('America/New_York');
	const [esTimezoneLabel, setEsTimezoneLabel] = useState('ET');
	const [esUtcOffset, setEsUtcOffset] = useState(-5);
	const [emailChannels, setEmailChannels] = useState<
		{ id: string; identifier: string; provider: string }[]
	>([]);

	// AI Receptionist states
	const [rcName, setRcName] = useState('');
	const [rcTone, setRcTone] = useState('warm and professional');
	const [rcCustomInstructions, setRcCustomInstructions] = useState('');
	const [rcSignature, setRcSignature] = useState('');
	const [rcAutoReply, setRcAutoReply] = useState(true);
	const [rcRateLimit, setRcRateLimit] = useState(5);
	const [rcBusinessHours, setRcBusinessHours] = useState('Mon-Fri 9am-5pm');
	const [rcRoutingInstructions, setRcRoutingInstructions] = useState('');
	const [rcBookingLink, setRcBookingLink] = useState('');
	const [rcKnowledgePages, setRcKnowledgePages] = useState<
		{ page_url: string; page_title: string }[]
	>([]);
	const [rcSelectedChannelId, setRcSelectedChannelId] = useState('');
	const [rcEmailChannels, setRcEmailChannels] = useState<
		{ id: string; identifier: string; provider: string }[]
	>([]);

	// ── Lead Qualification Agent ──────────────────────────────────────
	const [lqThreshold, setLqThreshold] = useState(70);
	const [lqAutoDeal, setLqAutoDeal] = useState(true);
	const [lqDealStage, setLqDealStage] = useState('Qualified');
	const [lqCustomCriteria, setLqCustomCriteria] = useState('');

	// ── Upsell & Cross-Sell Agent ─────────────────────────────────────
	const [upsellCooldown, setUpsellCooldown] = useState(14);
	const [upsellThreshold, setUpsellThreshold] = useState(60);
	const [upsellTone, setUpsellTone] = useState('warm and professional');
	const [upsellChannelId, setUpsellChannelId] = useState('');
	const [upsellEmailChannels, setUpsellEmailChannels] = useState<
		{ id: string; identifier: string; provider: string }[]
	>([]);

	// ── Lead Prospector Agent ─────────────────────────────────────────────
	const [lpIndustry, setLpIndustry] = useState('');
	const [lpTitles, setLpTitles] = useState('');
	const [lpKeywords, setLpKeywords] = useState('');
	const [lpCompetitors, setLpCompetitors] = useState('');
	const [lpLocation, setLpLocation] = useState('');
	const [lpIntentThreshold, setLpIntentThreshold] = useState(60);
	const [lpDailyLimit, setLpDailyLimit] = useState(20);
	const [lpAutoImport, setLpAutoImport] = useState(false);
	const [lpServiceTargeting, setLpServiceTargeting] = useState(true);
	const [lpAutoOutreach, setLpAutoOutreach] = useState(false);
	const [lpOutreachThreshold, setLpOutreachThreshold] = useState(70);
	const [lpPack, setLpPack] = useState('balanced');
	const [lpWeights, setLpWeights] = useState<Record<string, number>>({});
	const [lpSavedConfig, setLpSavedConfig] = useState<Record<string, any>>({});
	const [lpRunning, setLpRunning] = useState(false);
	const [lpLastRun, setLpLastRun] = useState<{
		total: number;
		imported: number;
	} | null>(null);

	// Payment Reminder states
	const [prDueSoon, setPrDueSoon] = useState(true);
	const [prDaysBefore, setPrDaysBefore] = useState(3);
	const [prOverdue, setPrOverdue] = useState(true);
	const [prDaysAfterFirst, setPrDaysAfterFirst] = useState(1);
	const [prOverdueFollowup, setPrOverdueFollowup] = useState(true);
	const [prDaysAfterFollowup, setPrDaysAfterFollowup] = useState(7);
	const [prFromName, setPrFromName] = useState('Billing');
	const [prSubjectDue, setPrSubjectDue] = useState(
		'Reminder: Invoice {{invoice_number}} due {{due_date}}',
	);
	const [prSubjectOverdue, setPrSubjectOverdue] = useState(
		'Overdue: Invoice {{invoice_number}} — payment required',
	);
	const [prMessageDue, setPrMessageDue] = useState('');
	const [prMessageOverdue, setPrMessageOverdue] = useState('');
	const [prChannelId, setPrChannelId] = useState('');
	const [prEmailChannels, setPrEmailChannels] = useState<
		{ id: string; identifier: string; provider: string }[]
	>([]);
	const [prStats, setPrStats] = useState<{
		outstanding: number;
		overdue: number;
	} | null>(null);
	const [testingPayment, setTestingPayment] = useState(false);

	// Load payment reminder config
	useEffect(() => {
		if (open && user?.clientId && isPaymentReminder) {
			loadPaymentReminderConfig();
		}
	}, [open, user?.clientId, isPaymentReminder]);

	const loadPaymentReminderConfig = async () => {
		setLoading(true);
		try {
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'payment_reminder')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (typeof cfg.enable_due_soon === 'boolean')
					setPrDueSoon(cfg.enable_due_soon);
				if (cfg.days_before_due) setPrDaysBefore(cfg.days_before_due);
				if (typeof cfg.enable_overdue === 'boolean')
					setPrOverdue(cfg.enable_overdue);
				if (cfg.days_after_due_first)
					setPrDaysAfterFirst(cfg.days_after_due_first);
				if (typeof cfg.enable_overdue_followup === 'boolean')
					setPrOverdueFollowup(cfg.enable_overdue_followup);
				if (cfg.days_after_due_followup)
					setPrDaysAfterFollowup(cfg.days_after_due_followup);
				if (cfg.from_name) setPrFromName(cfg.from_name);
				if (cfg.subject_template_due_soon)
					setPrSubjectDue(cfg.subject_template_due_soon);
				if (cfg.subject_template_overdue)
					setPrSubjectOverdue(cfg.subject_template_overdue);
				if (cfg.message_template_due_soon)
					setPrMessageDue(cfg.message_template_due_soon);
				if (cfg.message_template_overdue)
					setPrMessageOverdue(cfg.message_template_overdue);
				if (cfg.channel_account_id) setPrChannelId(cfg.channel_account_id);
			}

			const { data: channels } = await supabase
				.from('channel_accounts')
				.select('id, identifier, provider')
				.eq('client_id', user!.clientId!)
				.eq('channel', 'email')
				.eq('is_active', true)
				.order('created_at', { ascending: true });
			if (channels) setPrEmailChannels(channels as any[]);

			if (!prFromName || prFromName === 'Billing') {
				const { data: client } = await supabase
					.from('clients')
					.select('business_name')
					.eq('id', user!.clientId!)
					.single();
				if (client?.business_name) setPrFromName(client.business_name);
			}

			// Stats
			const { count: outstandingCount } = await supabase
				.from('invoices')
				.select('id', { count: 'exact', head: true })
				.eq('client_id', user!.clientId!)
				.eq('status', 'Sent');
			const { count: overdueCount } = await supabase
				.from('invoices')
				.select('id', { count: 'exact', head: true })
				.eq('client_id', user!.clientId!)
				.eq('status', 'Overdue');
			setPrStats({
				outstanding: outstandingCount || 0,
				overdue: overdueCount || 0,
			});
		} catch (e) {
			console.error('Failed to load payment reminder config:', e);
		} finally {
			setLoading(false);
		}
	};

	const savePaymentReminderConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				enable_due_soon: prDueSoon,
				days_before_due: prDaysBefore,
				enable_overdue: prOverdue,
				days_after_due_first: prDaysAfterFirst,
				enable_overdue_followup: prOverdueFollowup,
				days_after_due_followup: prDaysAfterFollowup,
				from_name: prFromName,
				subject_template_due_soon: prSubjectDue,
				subject_template_overdue: prSubjectOverdue,
				message_template_due_soon: prMessageDue,
				message_template_overdue: prMessageOverdue,
				channel_account_id: prChannelId || null,
			};

			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'payment_reminder')
				.maybeSingle();

			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config, active: true } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Invoice and Payment Reminder',
					agent_type: 'payment_reminder',
					category: 'Ops',
					active: true,
					description: agent.description,
					config,
				} as any);
			}

			toast.success('Payment reminder configuration saved!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	const testPaymentReminders = async () => {
		if (!user?.clientId) return;
		setTestingPayment(true);
		try {
			const { data, error } = await supabase.functions.invoke(
				'payment-reminders',
				{
					body: { client_id: user.clientId },
				},
			);
			if (error) throw error;
			const total =
				(data?.due_soon || 0) +
				(data?.overdue || 0) +
				(data?.overdue_followup || 0);
			if (total > 0) {
				toast.success(`Sent ${total} payment reminder(s)!`);
			} else {
				toast.info('No pending payment reminders to send right now.');
			}
			if (data?.errors > 0) {
				toast.warning(`${data.errors} reminder(s) failed to send.`);
			}
		} catch (e: any) {
			toast.error(e.message || 'Failed to trigger payment reminders');
		} finally {
			setTestingPayment(false);
		}
	};

	// Load reminder config when opening
	useEffect(() => {
		if (open && user?.clientId && isAppointmentReminder) {
			loadReminderConfig();
		}
	}, [open, user?.clientId, isAppointmentReminder]);

	const loadReminderConfig = async () => {
		setLoading(true);
		try {
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'appointment_reminder')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (typeof cfg.enable_24h === 'boolean') setEnable24h(cfg.enable_24h);
				if (typeof cfg.enable_1h === 'boolean') setEnable1h(cfg.enable_1h);
				if (typeof cfg.enable_48h === 'boolean') setEnable48h(cfg.enable_48h);
				if (cfg.from_name) setReminderFromName(cfg.from_name);
				if (cfg.subject_template) setReminderSubject(cfg.subject_template);
				if (cfg.message_template) setReminderMessage(cfg.message_template);
				if (cfg.channel_account_id)
					setReminderChannelId(cfg.channel_account_id);
			}

			// Load email channel accounts
			const { data: channels } = await supabase
				.from('channel_accounts')
				.select('id, identifier, provider')
				.eq('client_id', user!.clientId!)
				.eq('channel', 'email')
				.eq('is_active', true)
				.order('created_at', { ascending: true });
			if (channels) setReminderEmailChannels(channels as any[]);

			// Load business name as default from_name
			if (!reminderFromName) {
				const { data: client } = await supabase
					.from('clients')
					.select('business_name')
					.eq('id', user!.clientId!)
					.single();
				if (client?.business_name) setReminderFromName(client.business_name);
			}

			// Get stats: count of reminders sent and upcoming appointments
			const now = new Date().toISOString();
			const { count: sentCount } = await supabase
				.from('appointments')
				.select('id', { count: 'exact', head: true })
				.eq('client_id', user!.clientId!)
				.not('reminder_24h_sent_at', 'is', null);
			const { count: upcomingCount } = await supabase
				.from('appointments')
				.select('id', { count: 'exact', head: true })
				.eq('client_id', user!.clientId!)
				.eq('status', 'scheduled')
				.gte('scheduled_at', now);
			setReminderStats({
				total_sent: sentCount || 0,
				upcoming: upcomingCount || 0,
			});
		} catch (e) {
			console.error('Failed to load reminder config:', e);
		} finally {
			setLoading(false);
		}
	};

	const saveReminderConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				enable_24h: enable24h,
				enable_1h: enable1h,
				enable_48h: enable48h,
				from_name: reminderFromName,
				subject_template: reminderSubject,
				message_template: reminderMessage,
				channel_account_id: reminderChannelId || null,
			};

			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'appointment_reminder')
				.maybeSingle();

			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config, active: true } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Appointment Reminder System',
					agent_type: 'appointment_reminder',
					category: 'Booking',
					active: true,
					description: agent.description,
					config,
				} as any);
			}

			toast.success('Reminder configuration saved!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	const testReminders = async () => {
		if (!user?.clientId) return;
		setTestingReminder(true);
		try {
			const { data, error } = await supabase.functions.invoke(
				'appointment-reminders',
				{
					body: { client_id: user.clientId },
				},
			);
			if (error) throw error;
			const total = (data?.reminded_24h || 0) + (data?.reminded_1h || 0);
			if (total > 0) {
				toast.success(
					`Sent ${total} reminder(s)! (24h: ${data.reminded_24h}, 1h: ${data.reminded_1h})`,
				);
			} else {
				toast.info('No pending reminders to send right now.');
			}
			if (data?.errors > 0) {
				toast.warning(`${data.errors} reminder(s) failed to send.`);
			}
		} catch (e: any) {
			toast.error(e.message || 'Failed to trigger reminders');
		} finally {
			setTestingReminder(false);
		}
	};

	// Load Aria config — reset state first so stale values never show on reopen
	useEffect(() => {
		if (open && user?.clientId && isEmailSales) {
			setEsPersonaName('');
			setEsTone('warm and professional');
			setEsCustomInstructions('');
			setEsSignature('');
			setEsAutoReply(true);
			setEsRateLimit(5);
			setEsSelectedChannelId('');
			setEsBlockedDomains('');
			loadEmailSalesConfig();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, user?.clientId, isEmailSales]);

	const loadEmailSalesConfig = async () => {
		setLoading(true);
		try {
			console.log('[Aria] loadEmailSalesConfig — clientId:', user!.clientId!);

			// Run all fetches in parallel so we never read stale React state
			const [agentRes, clientRes, channelsRes, pagesRes] = await Promise.all([
				supabase
					.from('agents' as any)
					.select('id, config')
					.eq('client_id', user!.clientId!)
					.in('agent_type', ['aria', 'email_sales'])
					.order('created_at', { ascending: false })
					.limit(1),
				supabase
					.from('clients')
					.select('business_name')
					.eq('id', user!.clientId!)
					.single(),
				supabase
					.from('channel_accounts')
					.select('id, identifier, provider')
					.eq('client_id', user!.clientId!)
					.eq('channel', 'email')
					.eq('is_active', true)
					.order('created_at', { ascending: true }),
				supabase
					.from('company_knowledge' as any)
					.select('page_url, page_title')
					.eq('client_id', user!.clientId!),
			]);

			console.log('[Aria] agentRes.data:', agentRes.data, '| agentRes.error:', agentRes.error);
			console.log('[Aria] clientRes.data:', clientRes.data, '| clientRes.error:', clientRes.error);

			// .limit(1) returns an array — pick the first row (handles duplicate agent_type rows)
			const agentRow = Array.isArray(agentRes.data) ? agentRes.data[0] : agentRes.data;
			const agentRowId: string | null = (agentRow as any)?.id || null;
			const cfg = (agentRow as any)?.config || {};
			console.log('[Aria] cfg:', cfg);

			// Always set every field unconditionally — saved value wins,
			// business name is only used when persona_name was never saved.
			setEsPersonaName(cfg.persona_name || clientRes.data?.business_name || 'Aria');
			setEsTone(cfg.tone || 'warm and professional');
			setEsCustomInstructions(cfg.custom_instructions || '');
			setEsSignature(cfg.signature || '');
			setEsAutoReply(typeof cfg.auto_reply_enabled === 'boolean' ? cfg.auto_reply_enabled : true);
			setEsRateLimit(cfg.rate_limit_minutes ?? 5);
			setEsSelectedChannelId(cfg.channel_account_id || '');
			setEsTimezone(cfg.timezone || 'America/New_York');
			setEsTimezoneLabel(cfg.timezone_label || 'ET');
			setEsUtcOffset(cfg.utc_offset_hours ?? -5);
			setEsBlockedDomains(
				Array.isArray(cfg.blocked_domains) && cfg.blocked_domains.length
					? (cfg.blocked_domains as string[]).join(', ')
					: ''
			);

			if (channelsRes.data) setEmailChannels(channelsRes.data as any[]);
			if (pagesRes.data) setEsKnowledgePages(pagesRes.data as any[]);
		} catch (e) {
			console.error('Failed to load Aria config:', e);
		} finally {
			setLoading(false);
		}
	};

	const saveEmailSalesConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				persona_name: esPersonaName,
				tone: esTone,
				custom_instructions: esCustomInstructions,
				signature: esSignature,
				auto_reply_enabled: esAutoReply,
				rate_limit_minutes: esRateLimit,
				channel_account_id: esSelectedChannelId || null,
				timezone: esTimezone,
				timezone_label: esTimezoneLabel,
				utc_offset_hours: esUtcOffset,
				blocked_domains: esBlockedDomains
					.split(',')
					.map((d) => d.trim().toLowerCase())
					.filter(Boolean),
			};

			// Fetch ALL rows for this agent (handles duplicates from old email_sales + new aria)
			const { data: existingRows } = await supabase
				.from('agents' as any)
				.select('id, agent_type')
				.eq('client_id', user.clientId)
				.in('agent_type', ['aria', 'email_sales'])
				.order('created_at', { ascending: false });

			const rows = (existingRows || []) as any[];
			// Keep the newest row as the canonical one, delete any extras
			if (rows.length > 1) {
				const [keep, ...dupes] = rows;
				await supabase
					.from('agents' as any)
					.delete()
					.in('id', dupes.map((r: any) => r.id));
				// Make sure the kept row has the canonical agent_type
				if (keep.agent_type !== 'aria') {
					await supabase
						.from('agents' as any)
						.update({ agent_type: 'aria', name: 'Aria — AI Business Assistant' } as any)
						.eq('id', keep.id);
				}
				rows.splice(1); // leave only [keep]
			}

			if (rows.length === 1) {
				const { error: updateErr } = await supabase
					.from('agents' as any)
					.update({ config, active: esAutoReply, agent_type: 'aria', name: 'Aria — AI Business Assistant' } as any)
					.eq('id', rows[0].id);
				if (updateErr) throw updateErr;
			} else {
				const { error: insertErr } = await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Aria — AI Business Assistant',
					agent_type: 'aria',
					category: 'Sales',
					active: esAutoReply,
					description: agent.description,
					config,
				} as any);
				if (insertErr) throw insertErr;
			}

			console.log('[Aria] saved config to DB:', config);
			toast.success('Aria configuration saved!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	// Load receptionist config
	useEffect(() => {
		if (open && user?.clientId && isEmailReceptionist) {
			loadReceptionistConfig();
		}
	}, [open, user?.clientId, isEmailReceptionist]);

	const loadReceptionistConfig = async () => {
		setLoading(true);
		try {
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'email_receptionist')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (cfg.receptionist_name) setRcName(cfg.receptionist_name);
				if (cfg.tone) setRcTone(cfg.tone);
				if (cfg.custom_instructions)
					setRcCustomInstructions(cfg.custom_instructions);
				if (cfg.signature) setRcSignature(cfg.signature);
				if (typeof cfg.auto_reply_enabled === 'boolean')
					setRcAutoReply(cfg.auto_reply_enabled);
				if (cfg.rate_limit_minutes) setRcRateLimit(cfg.rate_limit_minutes);
				if (cfg.business_hours) setRcBusinessHours(cfg.business_hours);
				if (cfg.routing_instructions)
					setRcRoutingInstructions(cfg.routing_instructions);
				if (cfg.booking_link) setRcBookingLink(cfg.booking_link);
				if (cfg.channel_account_id)
					setRcSelectedChannelId(cfg.channel_account_id);
			}

			if (!rcName) {
				const { data: client } = await supabase
					.from('clients')
					.select('business_name')
					.eq('id', user!.clientId!)
					.single();
				if (client?.business_name)
					setRcName(`${client.business_name} Receptionist`);
			}

			const { data: channels } = await supabase
				.from('channel_accounts')
				.select('id, identifier, provider')
				.eq('client_id', user!.clientId!)
				.eq('channel', 'email')
				.eq('is_active', true)
				.order('created_at', { ascending: true });
			if (channels) setRcEmailChannels(channels as any[]);

			const { data: pages } = await supabase
				.from('company_knowledge' as any)
				.select('page_url, page_title')
				.eq('client_id', user!.clientId!);
			if (pages) setRcKnowledgePages(pages as any[]);
		} catch (e) {
			console.error('Failed to load receptionist config:', e);
		} finally {
			setLoading(false);
		}
	};

	const saveReceptionistConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				receptionist_name: rcName,
				tone: rcTone,
				custom_instructions: rcCustomInstructions,
				signature: rcSignature,
				auto_reply_enabled: rcAutoReply,
				rate_limit_minutes: rcRateLimit,
				business_hours: rcBusinessHours,
				routing_instructions: rcRoutingInstructions,
				booking_link: rcBookingLink,
				channel_account_id: rcSelectedChannelId || null,
			};

			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'email_receptionist')
				.maybeSingle();

			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config, active: rcAutoReply } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'AI Receptionist',
					agent_type: 'email_receptionist',
					category: 'Service',
					active: rcAutoReply,
					description: agent.description,
					config,
				} as any);
			}

			toast.success('AI Receptionist configuration saved!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	// ── Lead Qualification config ─────────────────────────────────────
	useEffect(() => {
		if (open && user?.clientId && isLeadQualification) {
			loadLeadQualConfig();
		}
	}, [open, user?.clientId, isLeadQualification]);

	const loadLeadQualConfig = async () => {
		setLoading(true);
		try {
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'lead_qualification')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (cfg.auto_deal_threshold != null)
					setLqThreshold(cfg.auto_deal_threshold);
				if (cfg.auto_deal != null) setLqAutoDeal(cfg.auto_deal);
				if (cfg.auto_deal_stage) setLqDealStage(cfg.auto_deal_stage);
				if (cfg.custom_criteria) setLqCustomCriteria(cfg.custom_criteria);
			}
		} finally {
			setLoading(false);
		}
	};

	const saveLeadQualConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				auto_deal_threshold: lqThreshold,
				auto_deal: lqAutoDeal,
				auto_deal_stage: lqDealStage,
				custom_criteria: lqCustomCriteria,
			};
			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'lead_qualification')
				.maybeSingle();
			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Lead Qualification Agent',
					agent_type: 'lead_qualification',
					category: 'Lead Gen',
					active: true,
					description: agent.description,
					config,
				} as any);
			}
			toast.success('Lead Qualification Agent configured!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	};

	// ── Prospector load/save/run ───────────────────────────────────────
	useEffect(() => {
		if (open && user?.clientId && isProspector) loadProspectorConfig();
	}, [open, user?.clientId, isProspector]);

	const loadProspectorConfig = async () => {
		setLoading(true);
		try {
			const { data: agentRow } = await supabase
				.from('agents' as any)
				.select('config')
				.eq('client_id', user!.clientId!)
				.eq('agent_type', 'lead_prospector')
				.maybeSingle();
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				setLpSavedConfig(cfg);
				if (cfg.signal_pack) setLpPack(cfg.signal_pack);
				if (cfg.signal_weights) setLpWeights(cfg.signal_weights);
				if (cfg.industry) setLpIndustry(cfg.industry);
				if (cfg.target_titles)
					setLpTitles((cfg.target_titles as string[]).join(', '));
				if (cfg.keywords) setLpKeywords((cfg.keywords as string[]).join(', '));
				if (cfg.competitors)
					setLpCompetitors((cfg.competitors as string[]).join(', '));
				if (cfg.location) setLpLocation(cfg.location);
				if (cfg.intent_threshold != null)
					setLpIntentThreshold(cfg.intent_threshold);
				if (cfg.daily_limit != null) setLpDailyLimit(cfg.daily_limit);
				if (typeof cfg.auto_import === 'boolean')
					setLpAutoImport(cfg.auto_import);
				if (typeof cfg.service_targeting === 'boolean')
					setLpServiceTargeting(cfg.service_targeting);
				if (typeof cfg.auto_outreach === 'boolean')
					setLpAutoOutreach(cfg.auto_outreach);
				if (cfg.outreach_threshold != null)
					setLpOutreachThreshold(cfg.outreach_threshold);
			}
		} finally {
			setLoading(false);
		}
	};

	const buildProspectorConfig = () => ({
		// Keep settings this form doesn't show (e.g. hiring_roles).
		...lpSavedConfig,
		signal_pack: lpPack,
		signal_weights: lpWeights,
		industry: lpIndustry.trim(),
		target_titles: lpTitles
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
		keywords: lpKeywords
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
		competitors: lpCompetitors
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
		location: lpLocation.trim(),
		intent_threshold: lpIntentThreshold,
		daily_limit: lpDailyLimit,
		auto_import: lpAutoImport,
		service_targeting: lpServiceTargeting,
		auto_outreach: lpAutoOutreach,
		outreach_threshold: lpOutreachThreshold,
	});

	const saveProspectorConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = buildProspectorConfig();
			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'lead_prospector')
				.maybeSingle();
			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Lead Prospector Agent',
					agent_type: 'lead_prospector',
					category: 'Lead Gen',
					active: true,
					description: agent.description,
					config,
				} as any);
			}
			setLpSavedConfig(config);
			// Re-score existing leads with the (possibly new) signal weights.
			supabase.functions.invoke('prospect-signals', { body: { action: 'rescore' } }).catch(() => {});
			toast.success('Lead Prospector configured!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	const runProspectorNow = async () => {
		if (!user?.clientId) return;
		setLpRunning(true);
		try {
			await saveProspectorConfig();
			const { data, error } = await supabase.functions.invoke(
				'lead-prospector',
				{
					body: { trigger: 'manual', client_id: user.clientId, user_id: user.id },
				},
			);
			if (error) throw error;
			const result = data?.results?.[0];
			if (result) {
				setLpLastRun({
					total: result.total || 0,
					imported: result.imported || 0,
				});
				toast.success(
					`Found ${result.total} prospects${result.imported ? `, imported ${result.imported} contacts` : ''}`,
				);
			} else {
				toast.success('Prospector run complete');
			}
		} catch (e: any) {
			toast.error(e.message || 'Run failed');
		} finally {
			setLpRunning(false);
		}
	};

	// ── Upsell load/save ───────────────────────────────────────────────
	useEffect(() => {
		if (open && user?.clientId && isUpsell) loadUpsellConfig();
	}, [open, user?.clientId, isUpsell]);

	const loadUpsellConfig = async () => {
		setLoading(true);
		try {
			const [{ data: agentRow }, { data: channels }] = await Promise.all([
				supabase
					.from('agents' as any)
					.select('config')
					.eq('client_id', user!.clientId!)
					.eq('agent_type', 'upsell')
					.maybeSingle(),
				supabase
					.from('channel_accounts' as any)
					.select('id, identifier, provider')
					.eq('client_id', user!.clientId!)
					.eq('channel', 'email')
					.eq('is_active', true),
			]);
			if (channels) setUpsellEmailChannels(channels as any[]);
			if (agentRow) {
				const cfg = (agentRow as any).config || {};
				if (cfg.cooldown_days != null) setUpsellCooldown(cfg.cooldown_days);
				if (cfg.confidence_threshold != null)
					setUpsellThreshold(cfg.confidence_threshold);
				if (cfg.tone) setUpsellTone(cfg.tone);
				if (cfg.channel_account_id) setUpsellChannelId(cfg.channel_account_id);
			}
		} finally {
			setLoading(false);
		}
	};

	const saveUpsellConfig = async () => {
		if (!user?.clientId) return;
		setSaving(true);
		try {
			const config = {
				cooldown_days: upsellCooldown,
				confidence_threshold: upsellThreshold,
				tone: upsellTone,
				channel_account_id: upsellChannelId || null,
			};
			const { data: existing } = await supabase
				.from('agents' as any)
				.select('id')
				.eq('client_id', user.clientId)
				.eq('agent_type', 'upsell')
				.maybeSingle();
			if (existing) {
				await supabase
					.from('agents' as any)
					.update({ config } as any)
					.eq('id', (existing as any).id);
			} else {
				await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					name: 'Upsell & Cross-Sell Agent',
					agent_type: 'upsell',
					category: 'Sales',
					active: true,
					description: agent.description,
					config,
				} as any);
			}
			toast.success('Upsell & Cross-Sell Agent configured!');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span className="text-xl">{agent.icon}</span>
						Configure {agent.name}
					</DialogTitle>
					<DialogDescription>{agent.description}</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : isLeadCapture ? (
					<div className="space-y-5">
						{/* Widget Embed Code */}
						<div>
							<Label className="text-sm font-semibold">Widget Embed Code</Label>
							<p className="text-xs text-muted-foreground mt-1 mb-2">
								Add this script tag to any website to embed the chat widget.
							</p>
							<div className="relative">
								<pre className="bg-muted p-3 rounded-lg text-xs font-mono break-all whitespace-pre-wrap pr-10">
									{widgetSnippet}
								</pre>
								<Button
									variant="ghost"
									size="sm"
									className="absolute top-2 right-2 h-7 w-7 p-0"
									onClick={copySnippet}
								>
									<Copy className="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>

						{/* Knowledge Base */}
						<div className="border-t pt-4">
							<div className="flex items-center gap-2 mb-1">
								<Globe className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Company Knowledge Base
								</Label>
							</div>
							<p className="text-xs text-muted-foreground mb-3">
								Scrape your website so the bot can answer questions about your
								business.
							</p>
							<div className="flex gap-2">
								<Input
									value={website}
									onChange={(e) => setWebsite(e.target.value)}
									placeholder="https://www.yourcompany.com"
									className="flex-1"
								/>
								<Button
									variant="outline"
									size="sm"
									disabled={!website.trim() || scraping}
									onClick={handleScrape}
								>
									{scraping ? (
										<>
											<Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
											Scraping...
										</>
									) : (
										<>
											<Globe className="w-3.5 h-3.5 mr-1" />
											Scrape
										</>
									)}
								</Button>
							</div>

							{/* Scraped pages list */}
							{knowledgePages.length > 0 && (
								<div className="mt-3 space-y-1">
									<p className="text-xs font-medium text-muted-foreground">
										{knowledgePages.length} pages in knowledge base:
									</p>
									<div className="max-h-32 overflow-y-auto space-y-1">
										{knowledgePages.map((p, i) => (
											<div
												key={i}
												className="flex items-center gap-2 text-xs text-muted-foreground"
											>
												<FileText className="w-3 h-3 shrink-0" />
												<span className="truncate">
													{p.page_title || p.page_url}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Bot Settings */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">Bot Settings</Label>
							<div>
								<Label className="text-xs">Bot Name</Label>
								<Input
									value={botName}
									onChange={(e) => setBotName(e.target.value)}
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">Greeting Message</Label>
								<Textarea
									value={greeting}
									onChange={(e) => setGreeting(e.target.value)}
									rows={2}
									className="mt-1"
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label className="text-xs">Require phone number</Label>
								<Switch
									checked={collectPhone}
									onCheckedChange={setCollectPhone}
								/>
							</div>
						</div>
					</div>
				) : isAppointmentReminder ? (
					<div className="space-y-5">
						{/* Stats */}
						{reminderStats && (
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-muted/50 rounded-lg p-3 text-center">
									<p className="text-2xl font-bold text-foreground">
										{reminderStats.total_sent}
									</p>
									<p className="text-xs text-muted-foreground">
										Reminders Sent
									</p>
								</div>
								<div className="bg-muted/50 rounded-lg p-3 text-center">
									<p className="text-2xl font-bold text-foreground">
										{reminderStats.upcoming}
									</p>
									<p className="text-xs text-muted-foreground">
										Upcoming Appointments
									</p>
								</div>
							</div>
						)}

						{/* Reminder Timing Toggles */}
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Reminder Schedule
								</Label>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">48-hour reminder</p>
										<p className="text-xs text-muted-foreground">
											Send 2 days before appointment
										</p>
									</div>
									<Switch
										checked={enable48h}
										onCheckedChange={setEnable48h}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">24-hour reminder</p>
										<p className="text-xs text-muted-foreground">
											Send 1 day before appointment
										</p>
									</div>
									<Switch
										checked={enable24h}
										onCheckedChange={setEnable24h}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">1-hour reminder</p>
										<p className="text-xs text-muted-foreground">
											Send 1 hour before appointment
										</p>
									</div>
									<Switch
										checked={enable1h}
										onCheckedChange={setEnable1h}
									/>
								</div>
							</div>
						</div>

						{/* Email Settings */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Email Settings</Label>
							</div>
							<div>
								<Label className="text-xs">From Name</Label>
								<Input
									value={reminderFromName}
									onChange={(e) => setReminderFromName(e.target.value)}
									placeholder="Your Business Name"
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">Subject Line</Label>
								<Input
									value={reminderSubject}
									onChange={(e) => setReminderSubject(e.target.value)}
									className="mt-1"
								/>
								<p className="text-[10px] text-muted-foreground mt-1">
									Variables: {'{{service}}'}, {'{{time_label}}'},{' '}
									{'{{first_name}}'}
								</p>
							</div>
							<div>
								<Label className="text-xs">Reminder Message</Label>
								<Textarea
									value={reminderMessage}
									onChange={(e) => setReminderMessage(e.target.value)}
									rows={3}
									className="mt-1"
								/>
								<p className="text-[10px] text-muted-foreground mt-1">
									Variables: {'{{first_name}}'}, {'{{service}}'}, {'{{date}}'},{' '}
									{'{{time}}'}, {'{{time_label}}'}
								</p>
							</div>
						</div>

						{/* Outbound Email Channel */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Outbound Email Channel
								</Label>
							</div>
							<p className="text-xs text-muted-foreground -mt-1">
								Select which email channel to send reminders from.
							</p>
							{reminderEmailChannels.length > 0 ? (
								<select
									value={reminderChannelId}
									onChange={(e) => setReminderChannelId(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">— Use default channel —</option>
									{reminderEmailChannels.map((ch) => (
										<option
											key={ch.id}
											value={ch.id}
										>
											{ch.identifier} (
											{ch.provider === 'gmail'
												? 'Gmail SMTP'
												: ch.provider === 'smtp'
													? 'SMTP'
													: ch.provider.charAt(0).toUpperCase() +
														ch.provider.slice(1)}
											)
										</option>
									))}
								</select>
							) : (
								<div className="text-xs text-amber-600 bg-amber-500/10 rounded-lg p-3">
									No email channels configured. Go to{' '}
									<span className="font-medium">Settings → Channels</span> to
									add one.
								</div>
							)}
						</div>

						{/* Test / Trigger */}
						<div className="border-t pt-4">
							<div className="flex items-center gap-2 mb-2">
								<Bell className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Manual Trigger</Label>
							</div>
							<p className="text-xs text-muted-foreground mb-3">
								Run the reminder check now to send any pending reminders
								immediately.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={testReminders}
								disabled={testingReminder}
								className="w-full"
							>
								{testingReminder ? (
									<>
										<Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
										Checking appointments...
									</>
								) : (
									<>
										<Play className="w-3.5 h-3.5 mr-1.5" />
										Send Pending Reminders Now
									</>
								)}
							</Button>
						</div>
					</div>
				) : isPaymentReminder ? (
					<div className="space-y-5">
						{/* Stats */}
						{prStats && (
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-muted/50 rounded-lg p-3 text-center">
									<p className="text-2xl font-bold text-foreground">
										{prStats.outstanding}
									</p>
									<p className="text-xs text-muted-foreground">
										Outstanding Invoices
									</p>
								</div>
								<div className="bg-amber-500/10 rounded-lg p-3 text-center">
									<p className="text-2xl font-bold text-amber-600">
										{prStats.overdue}
									</p>
									<p className="text-xs text-muted-foreground">
										Overdue Invoices
									</p>
								</div>
							</div>
						)}

						{/* Reminder Schedule */}
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Reminder Schedule
								</Label>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">Due-soon reminder</p>
										<p className="text-xs text-muted-foreground">
											Send before the due date
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Input
											type="number"
											min={1}
											max={14}
											value={prDaysBefore}
											onChange={(e) => setPrDaysBefore(Number(e.target.value))}
											className="w-16 h-8 text-center text-sm"
										/>
										<span className="text-xs text-muted-foreground">days</span>
										<Switch
											checked={prDueSoon}
											onCheckedChange={setPrDueSoon}
										/>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">Overdue reminder</p>
										<p className="text-xs text-muted-foreground">
											Send after the due date passes
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Input
											type="number"
											min={1}
											max={14}
											value={prDaysAfterFirst}
											onChange={(e) =>
												setPrDaysAfterFirst(Number(e.target.value))
											}
											className="w-16 h-8 text-center text-sm"
										/>
										<span className="text-xs text-muted-foreground">days</span>
										<Switch
											checked={prOverdue}
											onCheckedChange={setPrOverdue}
										/>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">Overdue follow-up</p>
										<p className="text-xs text-muted-foreground">
											Second reminder for still-overdue invoices
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Input
											type="number"
											min={1}
											max={30}
											value={prDaysAfterFollowup}
											onChange={(e) =>
												setPrDaysAfterFollowup(Number(e.target.value))
											}
											className="w-16 h-8 text-center text-sm"
										/>
										<span className="text-xs text-muted-foreground">days</span>
										<Switch
											checked={prOverdueFollowup}
											onCheckedChange={setPrOverdueFollowup}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Email Settings */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Email Settings</Label>
							</div>
							<div>
								<Label className="text-xs">From Name</Label>
								<Input
									value={prFromName}
									onChange={(e) => setPrFromName(e.target.value)}
									placeholder="Your Business Name"
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">Due-Soon Subject</Label>
								<Input
									value={prSubjectDue}
									onChange={(e) => setPrSubjectDue(e.target.value)}
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">Overdue Subject</Label>
								<Input
									value={prSubjectOverdue}
									onChange={(e) => setPrSubjectOverdue(e.target.value)}
									className="mt-1"
								/>
								<p className="text-[10px] text-muted-foreground mt-1">
									Variables: {'{{invoice_number}}'}, {'{{amount}}'},{' '}
									{'{{due_date}}'}, {'{{contact_name}}'}, {'{{days_label}}'}
								</p>
							</div>
							<div>
								<Label className="text-xs">Due-Soon Message (optional)</Label>
								<Textarea
									value={prMessageDue}
									onChange={(e) => setPrMessageDue(e.target.value)}
									rows={2}
									className="mt-1"
									placeholder="Leave blank for default message"
								/>
							</div>
							<div>
								<Label className="text-xs">Overdue Message (optional)</Label>
								<Textarea
									value={prMessageOverdue}
									onChange={(e) => setPrMessageOverdue(e.target.value)}
									rows={2}
									className="mt-1"
									placeholder="Leave blank for default message"
								/>
							</div>
						</div>

						{/* Outbound Email Channel */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Outbound Email Channel
								</Label>
							</div>
							{prEmailChannels.length > 0 ? (
								<select
									value={prChannelId}
									onChange={(e) => setPrChannelId(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">— Use default channel —</option>
									{prEmailChannels.map((ch) => (
										<option
											key={ch.id}
											value={ch.id}
										>
											{ch.identifier} (
											{ch.provider === 'gmail'
												? 'Gmail SMTP'
												: ch.provider === 'smtp'
													? 'SMTP'
													: ch.provider.charAt(0).toUpperCase() +
														ch.provider.slice(1)}
											)
										</option>
									))}
								</select>
							) : (
								<div className="text-xs text-amber-600 bg-amber-500/10 rounded-lg p-3">
									No email channels configured. Go to{' '}
									<span className="font-medium">Settings → Channels</span> to
									add one.
								</div>
							)}
						</div>

						{/* Manual Trigger */}
						<div className="border-t pt-4">
							<div className="flex items-center gap-2 mb-2">
								<Bell className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Manual Trigger</Label>
							</div>
							<p className="text-xs text-muted-foreground mb-3">
								Run the payment reminder check now to send any pending reminders
								immediately.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={testPaymentReminders}
								disabled={testingPayment}
								className="w-full"
							>
								{testingPayment ? (
									<>
										<Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
										Checking invoices...
									</>
								) : (
									<>
										<Play className="w-3.5 h-3.5 mr-1.5" />
										Send Pending Reminders Now
									</>
								)}
							</Button>
						</div>
					</div>
				) : isEmailSales ? (
					<div className="space-y-5">
						{/* Auto-Reply Toggle */}
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">Aria Auto-Reply</p>
								<p className="text-xs text-muted-foreground">
									Aria will classify and respond to every inbound email — sales, support, inquiries, partnerships, and more
								</p>
							</div>
							<Switch
								checked={esAutoReply}
								onCheckedChange={setEsAutoReply}
							/>
						</div>

						{/* Outbound Email Channel */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Outbound Email Channel
								</Label>
							</div>
							<p className="text-xs text-muted-foreground -mt-1">
								Select which email channel Aria uses to send replies.
							</p>
							{emailChannels.length > 0 ? (
								<select
									value={esSelectedChannelId}
									onChange={(e) => setEsSelectedChannelId(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">— Use default channel —</option>
									{emailChannels.map((ch) => (
										<option
											key={ch.id}
											value={ch.id}
										>
											{ch.identifier} (
											{ch.provider === 'gmail'
												? 'Gmail SMTP'
												: ch.provider === 'smtp'
													? 'SMTP'
													: ch.provider.charAt(0).toUpperCase() +
														ch.provider.slice(1)}
											)
										</option>
									))}
								</select>
							) : (
								<div className="text-xs text-amber-600 bg-amber-500/10 rounded-lg p-3">
									No email channels configured. Go to{' '}
									<span className="font-medium">Settings → Channels</span> to
									add one.
								</div>
							)}
						</div>

						{/* Persona Settings */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Mail className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Agent Persona</Label>
							</div>
							<div>
								<Label className="text-xs">Assistant Name</Label>
								<Input
									value={esPersonaName}
									onChange={(e) => setEsPersonaName(e.target.value)}
									placeholder="Aria"
									className="mt-1"
								/>
								<p className="text-[10px] text-muted-foreground mt-1">
									The name Aria uses when signing off replies (default: Aria)
								</p>
							</div>
							<div>
								<Label className="text-xs">Tone</Label>
								<select
									value={esTone}
									onChange={(e) => setEsTone(e.target.value)}
									className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="warm and professional">
										Warm & Professional
									</option>
									<option value="casual and friendly">Casual & Friendly</option>
									<option value="formal and authoritative">
										Formal & Authoritative
									</option>
									<option value="enthusiastic and energetic">
										Enthusiastic & Energetic
									</option>
								</select>
							</div>
							<div>
								<Label className="text-xs">Email Signature</Label>
								<Textarea
									value={esSignature}
									onChange={(e) => setEsSignature(e.target.value)}
									placeholder="Your Name&#10;Sales Team&#10;yourcompany.com"
									rows={2}
									className="mt-1"
								/>
							</div>
						</div>

						{/* Custom Instructions */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">
								Custom Instructions
							</Label>
							<Textarea
								value={esCustomInstructions}
								onChange={(e) => setEsCustomInstructions(e.target.value)}
								placeholder="e.g., Always mention our free consultation offer. Focus on our premium packages. Don't discuss pricing — direct them to book a call."
								rows={3}
							/>
							<p className="text-[10px] text-muted-foreground">
								Additional guidelines for the AI when crafting replies
							</p>
						</div>

						{/* Rate Limiting */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Rate Limiting</Label>
							</div>
							<div className="flex items-center gap-3">
								<Label className="text-xs whitespace-nowrap">
									Cooldown (minutes)
								</Label>
								<Input
									type="number"
									min={1}
									max={60}
									value={esRateLimit}
									onChange={(e) => setEsRateLimit(Number(e.target.value))}
									className="w-20"
								/>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Minimum time between auto-replies to the same contact
							</p>
						</div>

						{/* Scheduling timezone */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Scheduling Timezone</Label>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Used when Aria checks your Cal.com calendar and offers/books times, so they show in your zone.
							</p>
							<select
								value={esTimezone}
								onChange={(e) => {
									const tz = TIMEZONE_OPTIONS.find(t => t.iana === e.target.value);
									if (!tz) return;
									setEsTimezone(tz.iana);
									setEsTimezoneLabel(tz.label);
									setEsUtcOffset(tzOffsetHours(tz.iana));
								}}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								{TIMEZONE_OPTIONS.map(t => (
									<option key={t.iana} value={t.iana}>
										{t.name} ({t.label}, UTC{tzOffsetHours(t.iana) >= 0 ? "+" : ""}{tzOffsetHours(t.iana)})
									</option>
								))}
							</select>
						</div>

						{/* Blocked Domains */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Shield className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Blocked Domains</Label>
							</div>
							<Textarea
								value={esBlockedDomains}
								onChange={(e) => setEsBlockedDomains(e.target.value)}
								placeholder="venmo.com, paypal.com, bankofamerica.com"
								rows={2}
							/>
							<p className="text-[10px] text-muted-foreground">
								Comma-separated domains Aria will never reply to. Banks, payment
								services, and bulk mailers are already blocked by default.
							</p>
						</div>

						{/* Knowledge Base */}
						{esKnowledgePages.length > 0 && (
							<div className="border-t pt-4">
								<div className="flex items-center gap-2 mb-2">
									<Globe className="w-4 h-4 text-primary" />
									<Label className="text-sm font-semibold">
										Company Knowledge
									</Label>
								</div>
								<p className="text-xs text-muted-foreground mb-2">
									The AI uses this knowledge to answer questions accurately.
								</p>
								<div className="max-h-32 overflow-y-auto space-y-1">
									{esKnowledgePages.map((p, i) => (
										<div
											key={i}
											className="flex items-center gap-2 text-xs text-muted-foreground"
										>
											<FileText className="w-3 h-3 shrink-0" />
											<span className="truncate">
												{p.page_title || p.page_url}
											</span>
										</div>
									))}
								</div>
								<p className="text-[10px] text-muted-foreground mt-2">
									Manage knowledge base in the Lead Capture agent settings.
								</p>
							</div>
						)}
					</div>
				) : isEmailReceptionist ? (
					<div className="space-y-5">
						{/* Auto-Reply Toggle */}
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">Auto-Reply Enabled</p>
								<p className="text-xs text-muted-foreground">
									Automatically respond to inbound emails as a receptionist
								</p>
							</div>
							<Switch
								checked={rcAutoReply}
								onCheckedChange={setRcAutoReply}
							/>
						</div>

						{/* Email Channel Selector */}
						{rcEmailChannels.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-1">
									<Mail className="w-4 h-4 text-primary" />
									<Label className="text-sm font-semibold">Send From</Label>
								</div>
								<select
									className="w-full border rounded-md px-3 py-2 text-sm bg-background"
									value={rcSelectedChannelId}
									onChange={(e) => setRcSelectedChannelId(e.target.value)}
								>
									<option value="">Default (platform email)</option>
									{rcEmailChannels.map((ch) => (
										<option
											key={ch.id}
											value={ch.id}
										>
											{ch.identifier} ({ch.provider})
										</option>
									))}
								</select>
							</div>
						)}

						{/* Persona Settings */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">
								Receptionist Persona
							</Label>
							<div>
								<Label className="text-xs">Name</Label>
								<Input
									value={rcName}
									onChange={(e) => setRcName(e.target.value)}
									placeholder="e.g. Sarah from Acme Corp"
								/>
							</div>
							<div>
								<Label className="text-xs">Tone</Label>
								<select
									className="w-full border rounded-md px-3 py-2 text-sm bg-background"
									value={rcTone}
									onChange={(e) => setRcTone(e.target.value)}
								>
									<option value="warm and professional">
										Warm & Professional
									</option>
									<option value="friendly and casual">Friendly & Casual</option>
									<option value="formal and corporate">
										Formal & Corporate
									</option>
									<option value="enthusiastic and energetic">
										Enthusiastic & Energetic
									</option>
								</select>
							</div>
							<div>
								<Label className="text-xs">Email Signature</Label>
								<Textarea
									value={rcSignature}
									onChange={(e) => setRcSignature(e.target.value)}
									placeholder="Best regards,&#10;Sarah | Acme Corp&#10;(555) 123-4567"
									rows={3}
								/>
							</div>
						</div>

						{/* Business Hours */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Business Hours</Label>
							</div>
							<Input
								value={rcBusinessHours}
								onChange={(e) => setRcBusinessHours(e.target.value)}
								placeholder="Mon-Fri 9am-5pm EST"
							/>
							<p className="text-[10px] text-muted-foreground">
								The AI will mention these hours when relevant (e.g. &quot;Our
								team is available...&quot;)
							</p>
						</div>

						{/* Booking Link */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">
								Appointment Booking Link
							</Label>
							<Input
								value={rcBookingLink}
								onChange={(e) => setRcBookingLink(e.target.value)}
								placeholder="https://calendly.com/your-company"
							/>
							<p className="text-[10px] text-muted-foreground">
								The AI will share this link when someone wants to schedule a
								meeting
							</p>
						</div>

						{/* Routing Instructions */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">
								Routing Instructions
							</Label>
							<Textarea
								value={rcRoutingInstructions}
								onChange={(e) => setRcRoutingInstructions(e.target.value)}
								placeholder="For billing questions, direct to billing@company.com&#10;For technical support, direct to support@company.com&#10;For partnerships, direct to partners@company.com"
								rows={4}
							/>
							<p className="text-[10px] text-muted-foreground">
								Tell the AI how to route complex requests to the right person or
								department
							</p>
						</div>

						{/* Custom Instructions */}
						<div className="border-t pt-4 space-y-3">
							<Label className="text-sm font-semibold">
								Custom Instructions
							</Label>
							<Textarea
								value={rcCustomInstructions}
								onChange={(e) => setRcCustomInstructions(e.target.value)}
								placeholder="Always mention our current promotion...&#10;Never discuss pricing for enterprise plans..."
								rows={3}
							/>
							<p className="text-[10px] text-muted-foreground">
								Additional guidelines for the AI receptionist
							</p>
						</div>

						{/* Rate Limiting */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2 mb-1">
								<Clock className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">Rate Limiting</Label>
							</div>
							<div className="flex items-center gap-3">
								<Label className="text-xs whitespace-nowrap">
									Cooldown (minutes)
								</Label>
								<Input
									type="number"
									min={1}
									max={60}
									value={rcRateLimit}
									onChange={(e) => setRcRateLimit(Number(e.target.value))}
									className="w-20"
								/>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Minimum time between auto-replies to the same contact
							</p>
						</div>

						{/* Knowledge Base */}
						{rcKnowledgePages.length > 0 && (
							<div className="border-t pt-4">
								<div className="flex items-center gap-2 mb-2">
									<Globe className="w-4 h-4 text-primary" />
									<Label className="text-sm font-semibold">
										Company Knowledge
									</Label>
								</div>
								<p className="text-xs text-muted-foreground mb-2">
									The AI uses this knowledge to answer FAQs accurately.
								</p>
								<div className="max-h-32 overflow-y-auto space-y-1">
									{rcKnowledgePages.map((p, i) => (
										<div
											key={i}
											className="flex items-center gap-2 text-xs text-muted-foreground"
										>
											<FileText className="w-3 h-3 shrink-0" />
											<span className="truncate">
												{p.page_title || p.page_url}
											</span>
										</div>
									))}
								</div>
								<p className="text-[10px] text-muted-foreground mt-2">
									Manage knowledge base in the Lead Capture agent settings.
								</p>
							</div>
						)}
					</div>
				) : isLeadQualification ? (
					<div className="space-y-5">
						{/* How it works */}
						<div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
							<div className="flex items-center gap-2 text-sm font-semibold text-primary">
								<Target className="w-4 h-4" /> How it works
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Every inbound email or SMS is scored 0–100 across 5 dimensions:{' '}
								<strong>Intent, Budget, Authority, Urgency, and Fit</strong>.
								The contact's lead score and status update automatically.
								High-scoring leads can be pushed straight into your pipeline as
								deals.
							</p>
							<div className="grid grid-cols-5 gap-1 mt-2">
								{[
									{ label: 'Intent', color: 'bg-blue-500' },
									{ label: 'Budget', color: 'bg-emerald-500' },
									{ label: 'Authority', color: 'bg-ember-500' },
									{ label: 'Urgency', color: 'bg-amber-500' },
									{ label: 'Fit', color: 'bg-rose-500' },
								].map((d) => (
									<div
										key={d.label}
										className="text-center"
									>
										<div className={`h-1.5 rounded-full ${d.color} mb-1`} />
										<span className="text-[9px] text-muted-foreground font-medium">
											{d.label}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Score threshold */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Qualification Threshold
								</Label>
							</div>
							<div className="flex items-center gap-3">
								<input
									type="range"
									min={30}
									max={90}
									step={5}
									value={lqThreshold}
									onChange={(e) => setLqThreshold(Number(e.target.value))}
									className="flex-1 accent-primary"
								/>
								<span
									className={`text-sm font-bold w-12 text-right ${lqThreshold >= 70 ? 'text-emerald-600' : lqThreshold >= 50 ? 'text-amber-600' : 'text-red-500'}`}
								>
									{lqThreshold}/100
								</span>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Contacts scoring {lqThreshold}+ are marked{' '}
								<strong>Qualified</strong>. Below {lqThreshold - 30} stays{' '}
								<strong>Lead</strong>. In between is <strong>Prospect</strong>.
							</p>
						</div>

						{/* Auto-create deal */}
						<div className="border-t pt-4 space-y-3">
							<div className="flex items-center gap-2">
								<Zap className="w-4 h-4 text-primary" />
								<Label className="text-sm font-semibold">
									Auto-Create Deal
								</Label>
							</div>
							<div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
								<div>
									<p className="text-sm font-medium">
										Create deal when score ≥ {lqThreshold}
									</p>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										Automatically adds a deal to your pipeline for high-scoring
										leads
									</p>
								</div>
								<Switch
									checked={lqAutoDeal}
									onCheckedChange={setLqAutoDeal}
								/>
							</div>
							{lqAutoDeal && (
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">
										Pipeline Stage
									</Label>
									<select
										value={lqDealStage}
										onChange={(e) => setLqDealStage(e.target.value)}
										className="w-full h-9 rounded-md border bg-background px-3 text-sm"
									>
										{['Lead', 'Qualified', 'Proposal', 'Negotiation'].map(
											(s) => (
												<option
													key={s}
													value={s}
												>
													{s}
												</option>
											),
										)}
									</select>
								</div>
							)}
						</div>

						{/* Custom criteria */}
						<div className="border-t pt-4 space-y-2">
							<Label className="text-sm font-semibold">
								Custom Qualification Criteria
							</Label>
							<Textarea
								value={lqCustomCriteria}
								onChange={(e) => setLqCustomCriteria(e.target.value)}
								placeholder="e.g. Only qualify leads with teams of 10+ employees. Prioritise SaaS companies. Ignore freelancers."
								rows={3}
								className="resize-none text-sm"
							/>
							<p className="text-[10px] text-muted-foreground">
								Additional rules the AI will apply when scoring leads.
							</p>
						</div>
					</div>
				) : isProspector ? (
					<div className="space-y-5">
						{/* How it works */}
						<div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
							<div className="flex items-center gap-2 text-sm font-semibold text-primary">
								<Target className="w-4 h-4" /> How it works
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Every day the agent reads <strong>job boards</strong>, <strong>company news</strong>{' '}
								(funding, new leaders, new offices, launches), <strong>SEC funding filings</strong>{' '}
								and each prospect's <strong>website tools</strong>. Signals for the same company add up
								and fade as they age, so the companies most likely to buy right now rise to the top
								of Prospected Leads.
							</p>
							<div className="grid grid-cols-4 gap-1 mt-2">
								{[
									{ icon: '💼', label: 'Job boards' },
									{ icon: '💰', label: 'Funding' },
									{ icon: '🏢', label: 'Company news' },
									{ icon: '🧰', label: 'Tech stack' },
								].map((s) => (
									<div
										key={s.label}
										className="bg-background rounded-md p-2 text-center border"
									>
										<div className="text-base">{s.icon}</div>
										<div className="text-[9px] text-muted-foreground mt-0.5 font-medium">
											{s.label}
										</div>
									</div>
								))}
							</div>
						</div>

						<SignalPackPicker pack={lpPack} weights={lpWeights}
							onChange={(p, w) => { setLpPack(p); setLpWeights(w); }} />

						{/* ICP config */}
						<div className="space-y-3">
							<Label className="text-sm font-semibold">
								Ideal Customer Profile (ICP)
							</Label>
							<div>
								<Label className="text-xs">Industry</Label>
								<Input
									value={lpIndustry}
									onChange={(e) => setLpIndustry(e.target.value)}
									placeholder="e.g. SaaS, Real Estate, Healthcare"
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">
									Target Job Titles{' '}
									<span className="text-muted-foreground">
										(comma-separated)
									</span>
								</Label>
								<Input
									value={lpTitles}
									onChange={(e) => setLpTitles(e.target.value)}
									placeholder="e.g. VP of Sales, Head of Marketing, Founder"
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">
									Keywords{' '}
									<span className="text-muted-foreground">
										(comma-separated)
									</span>
								</Label>
								<Input
									value={lpKeywords}
									onChange={(e) => setLpKeywords(e.target.value)}
									placeholder="e.g. CRM software, lead generation, sales automation"
									className="mt-1"
								/>
							</div>
							<div>
								<Label className="text-xs">
									Competitors to Monitor{' '}
									<span className="text-muted-foreground">
										(comma-separated)
									</span>
								</Label>
								<Input
									value={lpCompetitors}
									onChange={(e) => setLpCompetitors(e.target.value)}
									placeholder="e.g. HubSpot, Salesforce, Pipedrive"
									className="mt-1"
								/>
								<p className="text-[10px] text-muted-foreground mt-1">
									Agent will find people actively looking to switch from these
									tools.
								</p>
							</div>
							<div>
								<Label className="text-xs">
									Location{' '}
									<span className="text-muted-foreground">(optional)</span>
								</Label>
								<Input
									value={lpLocation}
									onChange={(e) => setLpLocation(e.target.value)}
									placeholder="e.g. United States, New York, London"
									className="mt-1"
								/>
							</div>
						</div>

						{/* Scoring & limits */}
						<div className="border-t pt-4 space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label className="text-sm font-semibold">
										Intent Threshold
									</Label>
									<span
										className={`text-sm font-bold ${lpIntentThreshold >= 70 ? 'text-emerald-600' : lpIntentThreshold >= 50 ? 'text-amber-600' : 'text-red-500'}`}
									>
										{lpIntentThreshold}/100
									</span>
								</div>
								<input
									type="range"
									min={30}
									max={90}
									step={5}
									value={lpIntentThreshold}
									onChange={(e) => setLpIntentThreshold(Number(e.target.value))}
									className="w-full accent-primary"
								/>
								<p className="text-[10px] text-muted-foreground">
									Only log leads with AI intent score above this. Higher =
									fewer, higher-quality results.
								</p>
							</div>

							<div className="flex items-center gap-3">
								<Label className="text-xs whitespace-nowrap">
									Max leads per day
								</Label>
								<Input
									type="number"
									min={5}
									max={100}
									value={lpDailyLimit}
									onChange={(e) => setLpDailyLimit(Number(e.target.value))}
									className="w-20"
								/>
								<p className="text-[10px] text-muted-foreground">
									Keeps Serper API usage within free tier (2,500/mo)
								</p>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
								<div>
									<p className="text-sm font-medium">Auto-import as contacts</p>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										Only imports leads where an email address was found in the
										search result
									</p>
								</div>
								<Switch
									checked={lpAutoImport}
									onCheckedChange={setLpAutoImport}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
								<div>
									<p className="text-sm font-medium">Service-driven targeting</p>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										Auto-generate keywords, titles & competitors from your company knowledge.
									</p>
								</div>
								<Switch checked={lpServiceTargeting} onCheckedChange={setLpServiceTargeting} />
							</div>

							<div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
								<div>
									<p className="text-sm font-medium">Auto-draft outreach</p>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										Draft a first-touch email for high-intent leads and queue it in your inbox "Needs review" for approval.
									</p>
								</div>
								<Switch checked={lpAutoOutreach} onCheckedChange={setLpAutoOutreach} />
							</div>

							{lpAutoOutreach && (
								<div className="flex items-center gap-3">
									<Label className="text-xs whitespace-nowrap">Outreach intent threshold</Label>
									<Input
										type="number"
										min={0}
										max={100}
										value={lpOutreachThreshold}
										onChange={(e) => setLpOutreachThreshold(Number(e.target.value))}
										className="w-20"
									/>
									<span className="text-[10px] text-muted-foreground">Only draft for leads at or above this intent score.</span>
								</div>
							)}
						</div>

						{/* Last run stats */}
						{/* {lpLastRun && (
							<div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
								<p className="text-xs text-emerald-800 font-medium">
									Last run results
								</p>
								<p className="text-xs text-emerald-700 mt-0.5">
									Found <strong>{lpLastRun.total}</strong> prospects above
									threshold
									{lpLastRun.imported > 0 && (
										<>
											{' '}
											· imported <strong>{lpLastRun.imported}</strong> new
											contacts
										</>
									)}
								</p>
							</div>
						)} */}

						{/* <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Free API required:</strong> Add your <strong>SERPER_API_KEY</strong> to Supabase Edge Function secrets. Get a free key (2,500 searches/mo) at{" "}
                <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">serper.dev</a>.
              </p>
            </div> */}
					</div>
				) : isUpsell ? (
					<div className="space-y-5">
						{/* How it works */}
						<div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
							<div className="flex items-center gap-2 text-sm font-semibold text-primary">
								<TrendingUp className="w-4 h-4" /> How it works
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Every day, the agent scans your existing clients and contacts.
								For each one, it reviews their deal history, invoices, and
								conversations, then uses AI to identify the single best{' '}
								<strong>upsell</strong> (upgrade) or <strong>cross-sell</strong>{' '}
								(complementary service) opportunity — and sends a personalized
								email automatically.
							</p>
							<div className="grid grid-cols-3 gap-2 mt-2">
								{[
									{ icon: '🔍', label: 'Analyzes history' },
									{ icon: '🤖', label: 'AI selects best offer' },
									{ icon: '📧', label: 'Sends personalized email' },
								].map((s) => (
									<div
										key={s.label}
										className="bg-background rounded-md p-2 text-center border"
									>
										<div className="text-lg">{s.icon}</div>
										<div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
											{s.label}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Confidence threshold */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">
								Confidence Threshold: {upsellThreshold}%
							</Label>
							<input
								type="range"
								min={40}
								max={95}
								value={upsellThreshold}
								onChange={(e) => setUpsellThreshold(Number(e.target.value))}
								className="w-full accent-primary"
							/>
							<p className="text-[10px] text-muted-foreground">
								Only send an email when AI confidence is above this threshold.
								Higher = fewer but more targeted emails.
							</p>
						</div>

						{/* Cooldown */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Cooldown Period</Label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									min={1}
									max={90}
									value={upsellCooldown}
									onChange={(e) => setUpsellCooldown(Number(e.target.value))}
									className="w-20 border rounded-md px-2 py-1 text-sm"
								/>
								<span className="text-sm text-muted-foreground">
									days between outreach to the same contact
								</span>
							</div>
						</div>

						{/* Tone */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Email Tone</Label>
							<select
								value={upsellTone}
								onChange={(e) => setUpsellTone(e.target.value)}
								className="w-full border rounded-md px-3 py-2 text-sm bg-background"
							>
								<option value="warm and professional">
									Warm & Professional
								</option>
								<option value="direct and concise">Direct & Concise</option>
								<option value="friendly and casual">Friendly & Casual</option>
								<option value="formal">Formal</option>
							</select>
						</div>

						{/* Email channel */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Send From</Label>
							<select
								value={upsellChannelId}
								onChange={(e) => setUpsellChannelId(e.target.value)}
								className="w-full border rounded-md px-3 py-2 text-sm bg-background"
							>
								<option value="">Default email account</option>
								{upsellEmailChannels.map((ch: any) => (
									<option
										key={ch.id}
										value={ch.id}
									>
										{ch.identifier} ({ch.provider})
									</option>
								))}
							</select>
						</div>

						{/* Knowledge base note */}
						<div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
							<p className="text-xs text-amber-800">
								<strong>Tip:</strong> The agent uses your{' '}
								<strong>Company Knowledge</strong> to identify what services to
								suggest. Make sure it's up to date in the Lead Capture agent
								settings.
							</p>
						</div>
					</div>
				) : (
					<div className="py-6 text-center text-sm text-muted-foreground">
						Configuration for this agent is coming soon.
					</div>
				)}

				<DialogFooter className="gap-2">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					{isLeadCapture && (
						<Button
							onClick={saveConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isAppointmentReminder && (
						<Button
							onClick={saveReminderConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isPaymentReminder && (
						<Button
							onClick={savePaymentReminderConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isEmailSales && (
						<Button
							onClick={saveEmailSalesConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isEmailReceptionist && (
						<Button
							onClick={saveReceptionistConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isLeadQualification && (
						<Button
							onClick={saveLeadQualConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isUpsell && (
						<Button
							onClick={saveUpsellConfig}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 mr-1 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									Save Configuration
								</>
							)}
						</Button>
					)}
					{isProspector && (
						<>
							<Button
								onClick={saveProspectorConfig}
								disabled={saving || lpRunning}
								variant="outline"
							>
								{saving ? (
									<>
										<Loader2 className="w-4 h-4 mr-1 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="w-4 h-4 mr-1" />
										Save
									</>
								)}
							</Button>
							<Button
								onClick={runProspectorNow}
								disabled={lpRunning || saving}
							>
								{lpRunning ? (
									<>
										<Loader2 className="w-4 h-4 mr-1 animate-spin" />
										Prospecting...
									</>
								) : (
									<>
										<Play className="w-4 h-4 mr-1" />
										Save & Run Now
									</>
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AgentConfigDialog;
