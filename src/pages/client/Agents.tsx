import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { mockAgents } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AgentConfigDialog from '@/components/AgentConfigDialog';
import ReviewAgentDialog from '@/components/ReviewAgentDialog';
import SalesOutreachDialog from '@/components/SalesOutreachDialog';
import AccountGrowthDialog from '@/components/growth/AccountGrowthDialog';
import SeoAgentDialog from '@/components/seo/SeoAgentDialog';
import { usePlan, type PlanFeature } from '@/hooks/usePlan';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EmailAssistantsPanel from '@/components/EmailAssistantsPanel';
import PersonalAssistantDialog from '@/components/PersonalAssistantDialog';
import { canReceive, loadEmailInboxes, type EmailInbox } from '@/lib/emailInboxes';
import { BRAND } from '@/brand';

const categories = [
	'All',
	'Lead Gen',
	'Booking',
	'Service',
	'Sales',
	'Retention',
	'Marketing',
	'Ops',
];

// Map mock agent names to DB agent_type values
const nameToAgentType: Record<string, string> = {
	'Lead Capture + Instant Response': 'lead_capture',
	'Appointment Reminder System': 'appointment_reminder',
	'Invoice and Payment Reminder': 'payment_reminder',
	'Aria — AI Business Assistant': 'aria',
	'AI Receptionist': 'email_receptionist',
	'Google Review Generator': 'review_request',
	'Sales Outreach Agent': 'sales_outreach',
	'Account Growth Agent': 'account_growth',
	'SEO Agent': 'seo',
	'Lead Qualification Agent': 'lead_qualification',
	'Upsell & Cross-Sell Agent': 'upsell',
	'Lead Prospector Agent': 'lead_prospector',
};

// Which plan feature each agent belongs to (brands with plans). Others are part of the core CRM.
const agentFeature: Record<string, PlanFeature> = {
	lead_capture: 'aria', email_receptionist: 'aria', aria: 'aria', lead_qualification: 'aria',
	review_request: 'reviews', sales_outreach: 'luna', account_growth: 'growth', lead_prospector: 'prospector', seo: 'seo',
};

const Agents = () => {
	const { user } = useAuth();
	const plan = usePlan();
	const lockedAgent = (name: string) => {
		const f = agentFeature[nameToAgentType[name]];
		return !!f && !plan.loading && !plan.has(f);
	};
	const [filter, setFilter] = useState('All');
	// Agents this storefront offers (src/brand features).
	const [agents, setAgents] = useState(() =>
		mockAgents.filter((a) => {
			const t = nameToAgentType[a.name];
			if (t === 'sales_outreach') return BRAND.features.outreach;
			if (t === 'account_growth') return BRAND.features.accountGrowth;
			if (t === 'upsell') return BRAND.features.upsell;
			if (t === 'seo') return BRAND.features.seo;
			if (t === 'lead_prospector') return BRAND.features.prospector;
			return true;
		}),
	);
	// Names people give their agents (shown on the card), by agent_type.
	const [customNames, setCustomNames] = useState<Record<string, string>>({});
	const [configAgent, setConfigAgent] = useState<(typeof mockAgents)[0] | null>(
		null,
	);

	// Email inboxes and who answers them (see EmailAssistantsPanel).
	const [inboxes, setInboxes] = useState<EmailInbox[]>([]);
	const [inboxesLoading, setInboxesLoading] = useState(true);
	const [receptionistActive, setReceptionistActive] = useState(false);
	const [paDialog, setPaDialog] = useState<{ open: boolean; inboxId?: string }>({ open: false });

	const reloadInboxes = useCallback(async () => {
		if (!user?.clientId) return;
		setInboxes(await loadEmailInboxes(user.clientId));
		setInboxesLoading(false);
	}, [user?.clientId]);

	useEffect(() => {
		reloadInboxes();
	}, [reloadInboxes]);

	const ariaActive = agents.some((a) => nameToAgentType[a.name] === 'aria' && a.active);
	const paInboxCount = inboxes.filter(
		(i) => canReceive(i) && i.config?.personal_assistant?.enabled && (i.config?.responder ?? 'personal_assistant') === 'personal_assistant',
	).length;
	const showPaCard = filter === 'All' || filter === 'Service';

	const syncActiveStates = useCallback(async () => {
		if (!user?.clientId) return;
		const { data: dbAgents } = await supabase
			.from('agents' as any)
			.select('agent_type, active, config')
			.eq('client_id', user.clientId);
		if (!dbAgents || dbAgents.length === 0) return;

		const activeMap = new Map<string, boolean>();
		const names: Record<string, string> = {};
		for (const row of dbAgents as any[]) {
			activeMap.set(row.agent_type, row.active);
			if (row.agent_type === 'sales_outreach' && row.config?.agent_name) names.sales_outreach = row.config.agent_name;
		}
		setCustomNames(names);
		setReceptionistActive(!!activeMap.get('email_receptionist'));

		setAgents((prev) =>
			prev.map((a) => {
				const agentType = nameToAgentType[a.name];
				if (agentType && activeMap.has(agentType)) {
					return { ...a, active: activeMap.get(agentType)! };
				}
				return a;
			}),
		);
	}, [user?.clientId]);

	useEffect(() => {
		syncActiveStates();
	}, [syncActiveStates]);

	const filtered = agents.filter(
		(a) => filter === 'All' || a.category === filter,
	);
	const activeCount = agents.filter((a) => a.active).length;

	const toggleAgent = async (id: string) => {
		const agent = agents.find((a) => a.id === id);
		if (!agent) return;
		const next = !agent.active;

		// The outreach agent needs a name and an offer before it can email anyone.
		if (next && nameToAgentType[agent.name] === 'sales_outreach' && !customNames.sales_outreach) {
			toast.message('Set up the agent first: give it a name and say what you offer.');
			setConfigAgent(agent);
			return;
		}

		// Update local state immediately
		setAgents((prev) =>
			prev.map((a) => (a.id === id ? { ...a, active: next } : a)),
		);
		toast.success(
			next ? `${agent.name} activated` : `${agent.name} deactivated`,
		);

		// Persist to DB if this agent has a known agent_type
		const agentType = nameToAgentType[agent.name];
		if (agentType && user?.clientId) {
			// Look for both the canonical type and any legacy type (e.g. aria + email_sales)
			const legacyTypes: Record<string, string> = { aria: 'email_sales' };
			const typesToSearch = [agentType, legacyTypes[agentType]].filter(
				Boolean,
			) as string[];

			const { data: existingRows } = await supabase
				.from('agents' as any)
				.select('id, agent_type')
				.eq('client_id', user.clientId)
				.in('agent_type', typesToSearch)
				.order('created_at', { ascending: false })
				.limit(1);

			const existing = Array.isArray(existingRows) ? existingRows[0] : null;

			if (existing) {
				const { error } = await supabase
					.from('agents' as any)
					.update({ active: next } as any)
					.eq('id', (existing as any).id);
				if (error) {
					console.error('Agent update error:', error);
					toast.error(`Failed to save agent state: ${error.message}`);
				}
			} else {
				const { error } = await supabase.from('agents' as any).insert({
					client_id: user.clientId,
					agent_type: agentType,
					name: agent.name,
					active: next,
					config: {},
				} as any);
				if (error) {
					console.error('Agent insert error:', error);
					toast.error(`Failed to save agent state: ${error.message}`);
				}
			}
		}
	};

	return (
		<div className="space-y-4">
			<div className="page-header">
				<div>
					<h1 className="page-title">AI Agents</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{activeCount} of {agents.length} active · 1,247 automations this
						month · Est. 43 hrs saved
					</p>
				</div>
			</div>

			<EmailAssistantsPanel
				inboxes={inboxes}
				loading={inboxesLoading}
				active={{ aria: ariaActive, email_receptionist: receptionistActive }}
				onChanged={reloadInboxes}
				onSetUpPersonalAssistant={(inboxId) => setPaDialog({ open: true, inboxId })}
			/>

			<div className="flex gap-2 flex-wrap">
				{categories.map((c) => (
					<button
						key={c}
						onClick={() => setFilter(c)}
						className={cn(
							'px-3 py-1.5 text-xs rounded-full font-medium transition-colors',
							filter === c
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-accent',
						)}
					>
						{c}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{showPaCard && (
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						className={cn('stat-card', paInboxCount === 0 && 'opacity-60')}
					>
						<div className="flex items-start justify-between mb-3">
							<div className="flex items-center gap-3">
								<span className="text-2xl">🧑‍💼</span>
								<div>
									<h3 className="text-sm font-semibold text-foreground">Personal Assistant</h3>
									<span
										className={cn(
											'text-[10px] px-2 py-0.5 rounded-full font-medium',
											paInboxCount > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
										)}
									>
										Service
									</span>
								</div>
							</div>
							<span className="text-[11px] text-muted-foreground whitespace-nowrap">
								{paInboxCount > 0 ? `Answering ${paInboxCount} inbox${paInboxCount > 1 ? 'es' : ''}` : 'Not answering any inbox'}
							</span>
						</div>
						<p className="text-xs text-muted-foreground leading-relaxed mb-3">
							Handles scheduling, bookings and questions as your assistant, without selling. Passes anything it can't handle to you.
						</p>
						<div className="border-t pt-3">
							<Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setPaDialog({ open: true })}>
								Configure
							</Button>
						</div>
					</motion.div>
				)}
				{filtered.map((agent, i) => (
					<motion.div
						key={agent.id}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.04 }}
						className={cn('stat-card', !agent.active && 'opacity-60')}
					>
						<div className="flex items-start justify-between mb-3">
							<div className="flex items-center gap-3">
								<span className="text-2xl">{agent.icon}</span>
								<div>
									<h3 className="text-sm font-semibold text-foreground">
										{customNames[nameToAgentType[agent.name]] || agent.name}
									</h3>
									{customNames[nameToAgentType[agent.name]] && (
										<div className="text-[11px] text-muted-foreground -mt-0.5 mb-0.5">{agent.name}</div>
									)}
									<span
										className={cn(
											'text-[10px] px-2 py-0.5 rounded-full font-medium',
											agent.active
												? 'bg-success/10 text-success'
												: 'bg-muted text-muted-foreground',
										)}
									>
										{agent.category}
									</span>
									{lockedAgent(agent.name) && (
										<span className="ml-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary"><Lock className="w-3 h-3" />Upgrade</span>
									)}
								</div>
							</div>
							<Switch
								checked={agent.active && !lockedAgent(agent.name)}
								disabled={lockedAgent(agent.name)}
								onCheckedChange={() => toggleAgent(agent.id)}
							/>
						</div>
						<p className="text-xs text-muted-foreground leading-relaxed mb-3">
							{agent.description}
						</p>
						<div className="border-t pt-3 space-y-1.5">
							{agent.active && (
								<>
									<div className="flex justify-between text-xs">
										<span className="text-muted-foreground">
											Triggers: {agent.triggers}
										</span>
										<span className="text-muted-foreground">
											{agent.metric}
										</span>
									</div>
									{/* {agent.roi && (
                    <div className="text-xs font-medium text-success">Est. ROI: {agent.roi}</div>
                  )} */}
								</>
							)}
							<div className="flex gap-2 mt-2">
								{lockedAgent(agent.name) ? (
									<Button size="sm" className="flex-1 h-7 text-xs" asChild>
										<Link to="/settings?tab=Billing">Add to my plan</Link>
									</Button>
								) : (
								<Button
									variant="outline"
									size="sm"
									className="flex-1 h-7 text-xs"
									onClick={() => setConfigAgent(agent)}
								>
									Configure
								</Button>
								)}
								{/* {agent.active && (
									<Button
										variant="outline"
										size="sm"
										className="flex-1 h-7 text-xs"
									>
										View Logs
									</Button>
								)} */}
							</div>
						</div>
					</motion.div>
				))}
			</div>

			<PersonalAssistantDialog
				open={paDialog.open}
				onOpenChange={(open) => setPaDialog((d) => ({ ...d, open }))}
				inboxes={inboxes}
				initialInboxId={paDialog.inboxId}
				onSaved={reloadInboxes}
			/>

			{configAgent && nameToAgentType[configAgent.name] === 'review_request' && (
				<ReviewAgentDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setConfigAgent(null);
							syncActiveStates();
						}
					}}
				/>
			)}
			{configAgent && nameToAgentType[configAgent.name] === 'sales_outreach' && (
				<SalesOutreachDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setConfigAgent(null);
							syncActiveStates();
						}
					}}
				/>
			)}
			{configAgent && nameToAgentType[configAgent.name] === 'account_growth' && (
				<AccountGrowthDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setConfigAgent(null);
							syncActiveStates();
						}
					}}
				/>
			)}
			{configAgent && nameToAgentType[configAgent.name] === 'seo' && (
				<SeoAgentDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setConfigAgent(null);
							syncActiveStates();
						}
					}}
				/>
			)}
			{configAgent && !['review_request', 'sales_outreach', 'account_growth', 'seo'].includes(nameToAgentType[configAgent.name]) && (
				<AgentConfigDialog
					open={!!configAgent}
					onOpenChange={(open) => {
						if (!open) {
							setConfigAgent(null);
							syncActiveStates();
						}
					}}
					agent={configAgent}
				/>
			)}
		</div>
	);
};

export default Agents;
