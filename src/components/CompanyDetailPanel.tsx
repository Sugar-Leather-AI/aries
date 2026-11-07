import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompanyInsightVisual from '@/components/CompanyInsightVisual';
import { Textarea } from '@/components/ui/textarea';
import {
	X,
	Pencil,
	Save,
	Building2,
	Globe,
	Users,
	TrendingUp,
	Brain,
	Target,
	MessageSquare,
	BarChart3,
	Sparkles,
	Loader2,
	ExternalLink,
	Mail,
	Phone,
	MapPin,
	User,
	Calendar,
	DollarSign,
	Linkedin,
	Twitter,
	Facebook,
	FileText,
	ChevronDown,
	ChevronUp,
	Briefcase,
	Star,
	ArrowRight,
	CircleDot,
	Trophy,
	Clock,
	Zap,
	Bookmark,
	ChartAreaIcon,
	BotIcon,
	ShieldCheck,
	AlertTriangle,
	RefreshCw,
	UserSearch,
} from 'lucide-react';
import { BRAND, COPY } from '@/brand';
import AccountGrowthPanel from '@/components/growth/AccountGrowthPanel';
import { scrapeCompany } from '@/lib/scrapeCompany';
import { SIGNAL_NAMES } from '@/components/ProspectSignalsDialog';

interface Company {
	id: string;
	name: string;
	website: string | null;
	domain: string | null;
	industry: string | null;
	segment: string | null;
	description: string | null;
	phone: string | null;
	email: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	address?: string | null;
	employee_count: string | null;
	revenue_range: string | null;
	founded_year: number | null;
	social_linkedin: string | null;
	social_twitter: string | null;
	social_facebook: string | null;
	ai_analysis: any;
	tags: string[] | null;
	created_at: string;
	client_id: string;
	is_bookmarked: boolean;
}

interface LinkedContact {
	id: string;
	first_name: string;
	last_name: string;
	email: string | null;
	phone: string | null;
	status: string | null;
	lead_score: number | null;
}

interface Deal {
	id: string;
	title: string;
	value: number | null;
	stage: string | null;
	contact_id: string | null;
	contact_name: string | null;
	expected_close_date: string | null;
	created_at: string;
}

const statusColors: Record<string, string> = {
	Lead: 'bg-blue-500/10 text-blue-600 border-blue-200',
	Client: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
	Prospect: 'bg-amber-500/10 text-amber-600 border-amber-200',
	Inactive: 'bg-muted text-muted-foreground border-border',
};

interface CompanyDetailPanelProps {
	company: Company | null;
	onClose: () => void;
	onAnalyze: (c: Company) => void;
	analyzing: boolean;
	onSaved: () => void;
}

export default function CompanyDetailPanel({
	company,
	onClose,
	onAnalyze,
	analyzing,
	onSaved,
}: CompanyDetailPanelProps) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [contacts, setContacts] = useState<LinkedContact[]>([]);
	const [loadingContacts, setLoadingContacts] = useState(false);
	const [knowledgePages, setKnowledgePages] = useState<any[]>([]);
	const [expandedPage, setExpandedPage] = useState<string | null>(null);
	const [deals, setDeals] = useState<Deal[]>([]);
	const [loadingDeals, setLoadingDeals] = useState(false);
	const [governanceProfile, setGovernanceProfile] = useState<any | null>(null);
	const [governanceRunId, setGovernanceRunId] = useState<string | null>(null);
	const [governanceStatus, setGovernanceStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
	const governancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// Auto-fill while editing and Find contact (companyTools), Prospector signals (prospector).
	const [autoFilling, setAutoFilling] = useState(false);
	const [scrapedPages, setScrapedPages] = useState<any[]>([]);
	const [findingContact, setFindingContact] = useState(false);
	const [prospectLeads, setProspectLeads] = useState<any[]>([]);
	const [form, setForm] = useState({
		address: '',
		name: '',
		website: '',
		industry: '',
		segment: '',
		description: '',
		phone: '',
		email: '',
		city: '',
		state: '',
		country: '',
		employee_count: '',
		revenue_range: '',
		founded_year: null as number | null,
		social_linkedin: '',
		social_twitter: '',
		social_facebook: '',
	});

	useEffect(() => {
		if (company) {
			setForm({
				address: company.address || '',
				name: company.name,
				website: company.website || '',
				industry: company.industry || '',
				segment: company.segment || '',
				description: company.description || '',
				phone: company.phone || '',
				email: company.email || '',
				city: company.city || '',
				state: company.state || '',
				country: company.country || '',
				employee_count: company.employee_count || '',
				revenue_range: company.revenue_range || '',
				founded_year: company.founded_year,
				social_linkedin: company.social_linkedin || '',
				social_twitter: company.social_twitter || '',
				social_facebook: company.social_facebook || '',
			});
			setEditing(false);
			setExpandedPage(null);
			setScrapedPages([]);
			if (BRAND.features.prospector) fetchProspectLeads(company);
			fetchLinkedContacts(company.id);
			fetchKnowledgePages(company.id);
			fetchDeals(company.id);
			// Load persisted governance profile
			const scraped = (company as any).scraped_data as any;
			if (scraped?.governance_profile) {
				setGovernanceProfile(scraped.governance_profile);
				setGovernanceStatus('done');
			} else {
				setGovernanceProfile(null);
				setGovernanceStatus('idle');
			}
			setGovernanceRunId(null);
			if (governancePollRef.current) clearInterval(governancePollRef.current);
		}
	}, [company]);

	/** Prospected leads for this company (imported into it, or the same domain or name) and their signals. */
	const fetchProspectLeads = async (c: Company) => {
		const ors = [`company_id.eq.${c.id}`];
		if (c.domain) ors.push(`company_domain.eq.${c.domain.replace(/^www\./, '')}`);
		const { data: leads } = await supabase.from('prospected_leads' as any)
			.select('id, company_name, source_url, source_type, trigger_event, snippet, intent_score, talking_point, fit_score, fit_reason, prospected_at, company_id')
			.or(ors.join(',')).is('dismissed_at', null).order('prospected_at', { ascending: false }).limit(20);
		let rows = (leads as any[]) || [];
		if (!rows.length && c.name) {
			const { data: byName } = await supabase.from('prospected_leads' as any)
				.select('id, company_name, source_url, source_type, trigger_event, snippet, intent_score, talking_point, fit_score, fit_reason, prospected_at, company_id')
				.ilike('company_name', c.name).is('dismissed_at', null).limit(20);
			rows = (byName as any[]) || [];
		}
		if (rows.length) {
			const { data: sigs } = await supabase.from('prospect_signals' as any)
				.select('lead_id, signal_type, label, strength, source_url, observed_at, detail')
				.in('lead_id', rows.map((r) => r.id)).order('observed_at', { ascending: false });
			for (const r of rows) r.signals = ((sigs as any[]) || []).filter((s) => s.lead_id === r.id);
		}
		setProspectLeads(rows);
	};

	/** Scrapes the website and fills the edit form (fields the site doesn't give keep their value). */
	const handleAutoFill = async () => {
		if (!form.website.trim()) { toast.error('Enter a website first'); return; }
		setAutoFilling(true);
		try {
			const { info, pages } = await scrapeCompany(form.website.trim());
			setScrapedPages(pages);
			setForm((f) => {
				const next: any = { ...f };
				for (const k of Object.keys(f)) {
					if (k === 'website') continue;
					const v = info[k];
					if (v !== undefined && v !== null && String(v).trim() !== '') next[k] = k === 'founded_year' ? Number(v) || f.founded_year : String(v);
				}
				return next;
			});
			toast.success(`Filled from ${pages.length} page${pages.length === 1 ? '' : 's'}. Check the fields, then save.`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to scrape the website');
		} finally {
			setAutoFilling(false);
		}
	};

	/** Finds the person to email at this company (website first, then Hunter) and adds them as a contact. */
	const handleFindContact = async () => {
		if (!company) return;
		setFindingContact(true);
		try {
			const { data, error } = await supabase.functions.invoke('prospect-signals', { body: { action: 'find-company-contact', company_id: company.id } });
			if (error || data?.error) throw new Error(data?.error || error?.message);
			const r = data?.result;
			if (r?.found) {
				toast.success(`Added ${r.name || r.email}${r.title ? `, ${r.title}` : ''}`);
				fetchLinkedContacts(company.id);
			} else toast.error(r?.reason || "Couldn't find anyone to email yet");
		} catch (e: any) {
			toast.error(e.message || 'Contact search failed');
		} finally {
			setFindingContact(false);
		}
	};

	const fetchLinkedContacts = async (companyId: string) => {
		setLoadingContacts(true);
		const { data } = await supabase
			.from('contacts')
			.select('id, first_name, last_name, email, phone, status, lead_score')
			.eq('company_id', companyId)
			.order('first_name');
		setContacts((data as LinkedContact[]) || []);
		setLoadingContacts(false);
	};

	const fetchKnowledgePages = async (companyId: string) => {
		const { data } = await supabase
			.from('company_knowledge')
			.select('id, page_url, page_title, content, page_type, scraped_at')
			.eq('company_id', companyId)
			.order('scraped_at', { ascending: false });
		setKnowledgePages((data as any[]) || []);
	};

	const fetchDeals = async (companyId: string) => {
		setLoadingDeals(true);
		const { data } = await supabase
			.from('deals')
			.select(
				'id, title, value, stage, contact_id, contact_name, expected_close_date, created_at',
			)
			.eq('company_id', companyId)
			.order('created_at', { ascending: false });
		setDeals((data as Deal[]) || []);
		setLoadingDeals(false);
	};

	// ── Governance profiler ─────────────────────────────────────────────────
	const startGovernanceProfile = async () => {
		if (!company) return;
		setGovernanceStatus('running');
		setGovernanceProfile(null);
		try {
			const { data, error } = await supabase.functions.invoke('governance-profiler', {
				body: {
					company_id: company.id,
					company_name: company.name,
					website: company.website || '',
					stock_ticker: null,
					github_org: null,
					proxy_enabled: false,
					max_pages: 12,
				},
			});
			if (error) throw error;
			if (data?.error) throw new Error(data.error);
			const runId: string = data.runId;
			const governanceRunIdVal: string | null = data.governance_run_id ?? null;
			setGovernanceRunId(runId);

			// Poll every 8 seconds (actor typically takes 2-5 min)
			governancePollRef.current = setInterval(async () => {
				try {
					const { data: poll, error: pollErr } = await supabase.functions.invoke('governance-profiler', {
						body: { runId, company_id: company.id, governance_run_id: governanceRunIdVal },
					});
					if (pollErr) throw pollErr;
					if (poll?.status === 'done') {
						clearInterval(governancePollRef.current!);
						setGovernanceProfile(poll.data);
						setGovernanceStatus('done');
						toast.success('Governance profile complete!');
					} else if (poll?.status === 'failed') {
						clearInterval(governancePollRef.current!);
						setGovernanceStatus('failed');
						toast.error(poll.error || 'Governance profiling failed');
					}
				} catch {
					// transient — keep polling
				}
			}, 8000);
		} catch (e: any) {
			setGovernanceStatus('failed');
			toast.error(e.message || 'Failed to start governance profiler');
		}
	};

	const handleSave = async () => {
		if (!company) return;
		setSaving(true);
		try {
			let url = form.website.trim();
			if (url && !url.startsWith('http')) url = `https://${url}`;
			let domain: string | null = null;
			try {
				domain = url ? new URL(url).hostname : null;
			} catch {}

			const { error } = await supabase
				.from('companies')
				.update({
					name: form.name,
					website: url || null,
					domain,
					industry: form.industry || null,
					segment: form.segment || null,
					description: form.description || null,
					phone: form.phone || null,
					email: form.email || null,
					...(BRAND.features.addresses ? { address: form.address || null } : {}),
					city: form.city || null,
					state: form.state || null,
					country: form.country || null,
					employee_count: form.employee_count || null,
					revenue_range: form.revenue_range || null,
					founded_year: form.founded_year,
					social_linkedin: form.social_linkedin || null,
					social_twitter: form.social_twitter || null,
					social_facebook: form.social_facebook || null,
				})
				.eq('id', company.id);
			if (error) throw error;
			// Pages read by Auto-fill become this company's knowledge (pages it already has are skipped).
			if (scrapedPages.length) {
				const { data: have } = await supabase.from('company_knowledge').select('page_url').eq('company_id', company.id);
				const known = new Set(((have as any[]) || []).map((k) => k.page_url));
				const rows = scrapedPages.filter((p: any) => p.url && !known.has(p.url)).map((p: any) => ({
					client_id: company.client_id, company_id: company.id, page_url: p.url, page_title: p.title || null,
					content: p.content, page_type: p.page_type || 'general', content_type: 'page',
				}));
				if (rows.length) await supabase.from('company_knowledge').insert(rows as any);
				setScrapedPages([]);
				fetchKnowledgePages(company.id);
			}
			toast.success('Company updated');
			setEditing(false);
			onSaved();
		} catch (e: any) {
			toast.error(e.message || 'Failed to update');
		} finally {
			setSaving(false);
		}
	};

	if (!company) return null;
	const analysis =
		company.ai_analysis && Object.keys(company.ai_analysis).length > 0
			? company.ai_analysis
			: null;
	const location = [BRAND.features.addresses ? company.address : null, company.city, company.state, company.country]
		.filter(Boolean)
		.join(', ');

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[49]"
				onClick={onClose}
			/>
			<motion.div
				initial={{ x: '100%' }}
				animate={{ x: 0 }}
				exit={{ x: '100%' }}
				transition={{ type: 'spring', damping: 30, stiffness: 300 }}
				className="fixed right-0 inset-y-0 w-full max-w-3xl bg-card border-l border-border z-50 flex flex-col shadow-2xl"
			>
				{/* Premium Header */}
				<div className="relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
					<div className="relative p-6 pb-4">
						<div className="flex items-start justify-between mb-4">
							<div className="flex items-center gap-4">
								<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-lg border border-primary/10 shadow-sm">
									{company.name.substring(0, 2).toUpperCase()}
								</div>
								<div>
									{editing ? (
										<Input
											value={form.name}
											onChange={(e) =>
												setForm((f) => ({ ...f, name: e.target.value }))
											}
											className="h-8 font-bold text-lg bg-background/50"
										/>
									) : (
										<h2 className="text-xl font-bold text-foreground">
											{company.name}
										</h2>
									)}
									<div className="flex items-center gap-2 mt-1">
										{company.industry && (
											<Badge
												variant="outline"
												className="text-[10px] bg-primary/10 text-primary border-primary/20"
											>
												{company.industry}
											</Badge>
										)}
										{company.segment && (
											<Badge
												variant="outline"
												className="text-[10px] border-border"
											>
												{company.segment}
											</Badge>
										)}
										{analysis && (
											<Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
												<Brain className="w-3 h-3 mr-1" />
												Analyzed
											</Badge>
										)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="rounded-full hover:bg-background/80"
									onClick={async () => {
										if (!company) return;
										const newVal = !company.is_bookmarked;
										const { error } = await supabase
											.from('companies')
											.update({ is_bookmarked: newVal } as any)
											.eq('id', company.id);
										if (error) {
											toast.error('Failed to update bookmark');
											return;
										}
										onSaved();
									}}
									title={company.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
								>
									<Bookmark
										className={cn(
											'w-5 h-5',
											company.is_bookmarked
												? 'fill-primary text-primary'
												: 'text-muted-foreground',
										)}
									/>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={onClose}
									className="rounded-full hover:bg-background/80"
								>
									<X className="w-5 h-5" />
								</Button>
							</div>
						</div>

						{/* Quick action buttons */}
						<div className="flex items-center gap-2">
							{editing ? (
								<>
									<Button
										size="sm"
										onClick={handleSave}
										disabled={saving}
										className="gap-1.5 rounded-full"
									>
										{saving ? (
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
										) : (
											<Save className="w-3.5 h-3.5" />
										)}
										{saving ? 'Saving...' : 'Save Changes'}
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setEditing(false)}
										className="rounded-full"
									>
										Cancel
									</Button>
								</>
							) : (
								<>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setEditing(true)}
										className="gap-1.5 rounded-full"
									>
										<Pencil className="w-3.5 h-3.5" />
										Edit
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => onAnalyze(company)}
										disabled={analyzing}
										className="gap-1.5 rounded-full"
									>
										{analyzing ? (
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
										) : (
											<Brain className="w-3.5 h-3.5" />
										)}
										{analyzing
											? 'Analyzing...'
											: analysis
												? 'Re-Analyze'
												: 'AI Analyze'}
									</Button>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Quick stats bar */}
				{!editing && (
					<div className="grid grid-cols-4 gap-px bg-border mx-0">
						{[
							{
								icon: Users,
								label: 'Employees',
								value: company.employee_count || '—',
							},
							{
								icon: DollarSign,
								label: 'Revenue',
								value: company.revenue_range || '—',
							},
							{
								icon: Calendar,
								label: 'Founded',
								value: company.founded_year?.toString() || '—',
							},
							{
								icon: User,
								label: 'Contacts',
								value: contacts.length.toString(),
							},
						].map(({ icon: Icon, label, value }) => (
							<div
								key={label}
								className="bg-card px-3 py-2.5 text-center"
							>
								<Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
								<p className="text-xs font-semibold text-foreground">{value}</p>
								<p className="text-[10px] text-muted-foreground">{label}</p>
							</div>
						))}
					</div>
				)}

				<div className="flex-1 overflow-y-auto">
					<Tabs defaultValue="info">
						<TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0 px-2">
							{[
								{ value: 'info', label: 'Details' },
								{ value: 'contacts', label: `Contacts (${contacts.length})` },
								{ value: 'revenue', label: 'Revenue Map' },
								{ value: 'visual', label: 'Visual' },
								{ value: 'analysis', label: 'AI Insights' },
								{
									value: 'knowledge',
									label: `Pages (${knowledgePages.length})`,
								},
								{ value: 'governance', label: 'Governance' },
								...(BRAND.features.prospector && prospectLeads.length ? [{ value: 'signals', label: `Signals (${prospectLeads.reduce((n, l) => n + (l.signals?.length || 0), 0)})` }] : []),
							].map((tab) => (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-2.5 text-sm font-medium"
								>
									{tab.label}
									{tab.value === 'visual' && analysis && (
										<ChartAreaIcon className="w-3 h-3 ml-1.5 text-primary" />
									)}
									{tab.value === 'analysis' && analysis && (
										<BotIcon className="w-3 h-3 ml-1.5 text-primary" />
									)}
									{tab.value === 'governance' && governanceStatus === 'done' && (
										<ShieldCheck className="w-3 h-3 ml-1.5 text-emerald-500" />
									)}
									{tab.value === 'governance' && governanceStatus === 'running' && (
										<Loader2 className="w-3 h-3 ml-1.5 animate-spin text-primary" />
									)}
								</TabsTrigger>
							))}
						</TabsList>

						{/* Info Tab */}
						<TabsContent
							value="info"
							className="p-5 space-y-5 mt-0"
						>
							{editing ? (
								<div className="space-y-4">
									{BRAND.features.companyTools && (
										<div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-3">
											<p className="text-xs text-muted-foreground flex-1">
												{autoFilling ? 'Reading the website: about, team, services, contact...' : scrapedPages.length ? `${scrapedPages.length} pages read. Check the fields, then save.` : 'Fill these fields from the company\'s website.'}
											</p>
											<Button size="sm" onClick={handleAutoFill} disabled={autoFilling} className="gap-1.5 shrink-0">
												{autoFilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
												{autoFilling ? 'Scraping...' : 'Auto-fill'}
											</Button>
										</div>
									)}
									<div>
										<Label className="text-xs text-muted-foreground">
											Description
										</Label>
										<Textarea
											value={form.description}
											onChange={(e) =>
												setForm((f) => ({ ...f, description: e.target.value }))
											}
											className="bg-background/50 resize-none mt-1"
											rows={2}
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										{[
											{ label: 'Website', key: 'website' },
											{ label: 'Industry', key: 'industry' },
											{ label: 'Segment', key: 'segment' },
											{ label: 'Phone', key: 'phone' },
											{ label: 'Email', key: 'email' },
											...(BRAND.features.addresses ? [{ label: 'Address', key: 'address' }] : []),
											{ label: 'City', key: 'city' },
											{ label: 'State', key: 'state' },
											{ label: 'Country', key: 'country' },
											{ label: 'Employees', key: 'employee_count' },
											{ label: 'Revenue Range', key: 'revenue_range' },
										].map(({ label, key }) => (
											<div key={key}>
												<Label className="text-xs text-muted-foreground">
													{label}
												</Label>
												<Input
													value={(form as any)[key]}
													onChange={(e) =>
														setForm((f) => ({ ...f, [key]: e.target.value }))
													}
													className="bg-background/50 mt-1"
												/>
											</div>
										))}
										<div>
											<Label className="text-xs text-muted-foreground">
												Founded Year
											</Label>
											<Input
												type="number"
												value={form.founded_year || ''}
												className="bg-background/50 mt-1"
												onChange={(e) =>
													setForm((f) => ({
														...f,
														founded_year: e.target.value
															? Number(e.target.value)
															: null,
													}))
												}
											/>
										</div>
									</div>
									<Separator />
									<div>
										<Label className="text-xs text-muted-foreground font-medium mb-2 block">
											Social Links
										</Label>
										<div className="grid grid-cols-3 gap-3">
											<div>
												<Label className="text-[10px] text-muted-foreground">
													LinkedIn
												</Label>
												<Input
													value={form.social_linkedin}
													onChange={(e) =>
														setForm((f) => ({
															...f,
															social_linkedin: e.target.value,
														}))
													}
													className="bg-background/50 mt-1 text-xs"
												/>
											</div>
											<div>
												<Label className="text-[10px] text-muted-foreground">
													Twitter
												</Label>
												<Input
													value={form.social_twitter}
													onChange={(e) =>
														setForm((f) => ({
															...f,
															social_twitter: e.target.value,
														}))
													}
													className="bg-background/50 mt-1 text-xs"
												/>
											</div>
											<div>
												<Label className="text-[10px] text-muted-foreground">
													Facebook
												</Label>
												<Input
													value={form.social_facebook}
													onChange={(e) =>
														setForm((f) => ({
															...f,
															social_facebook: e.target.value,
														}))
													}
													className="bg-background/50 mt-1 text-xs"
												/>
											</div>
										</div>
									</div>
								</div>
							) : (
								<>
									{/* Description */}
									{company.description && (
										<div className="p-4 rounded-xl bg-muted/30 border">
											<p className="text-sm text-muted-foreground leading-relaxed">
												{company.description}
											</p>
										</div>
									)}

									{/* Info grid */}
									<div className="grid grid-cols-2 gap-4">
										{[
											{
												icon: Globe,
												label: 'Website',
												value: company.website,
												link: true,
											},
											{ icon: Globe, label: 'Domain', value: company.domain },
											{ icon: Phone, label: 'Phone', value: company.phone },
											{ icon: Mail, label: 'Email', value: company.email },
											{ icon: MapPin, label: 'Location', value: location },
											{
												icon: Users,
												label: 'Employees',
												value: company.employee_count,
											},
											{
												icon: DollarSign,
												label: 'Revenue',
												value: company.revenue_range,
											},
											{
												icon: Calendar,
												label: 'Founded',
												value: company.founded_year?.toString(),
											},
										]
											.filter((item) => item.value)
											.map(({ icon: Icon, label, value, link }) => (
												<div
													key={label}
													className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border transition-colors"
												>
													<div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
														<Icon className="w-4 h-4 text-primary/70" />
													</div>
													<div className="min-w-0">
														<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
															{label}
														</p>
														{link ? (
															<a
																href={value!}
																target="_blank"
																rel="noopener"
																className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
															>
																{value}{' '}
																<ExternalLink className="w-3 h-3 shrink-0" />
															</a>
														) : (
															<p className="text-sm font-medium text-foreground truncate">
																{value}
															</p>
														)}
													</div>
												</div>
											))}
									</div>

									{/* Social Links */}
									{(company.social_linkedin ||
										company.social_twitter ||
										company.social_facebook) && (
										<>
											<Separator />
											<div>
												<p className="text-xs font-medium text-muted-foreground mb-3">
													Social Profiles
												</p>
												<div className="flex gap-2">
													{company.social_linkedin && (
														<a
															href={company.social_linkedin}
															target="_blank"
															rel="noopener"
														>
															<Button
																variant="outline"
																size="sm"
																className="gap-1.5 rounded-full text-xs"
															>
																<Linkedin className="w-3.5 h-3.5" />
																LinkedIn
															</Button>
														</a>
													)}
													{company.social_twitter && (
														<a
															href={company.social_twitter}
															target="_blank"
															rel="noopener"
														>
															<Button
																variant="outline"
																size="sm"
																className="gap-1.5 rounded-full text-xs"
															>
																<Twitter className="w-3.5 h-3.5" />
																Twitter
															</Button>
														</a>
													)}
													{company.social_facebook && (
														<a
															href={company.social_facebook}
															target="_blank"
															rel="noopener"
														>
															<Button
																variant="outline"
																size="sm"
																className="gap-1.5 rounded-full text-xs"
															>
																<Facebook className="w-3.5 h-3.5" />
																Facebook
															</Button>
														</a>
													)}
												</div>
											</div>
										</>
									)}
								</>
							)}
						</TabsContent>

						{/* Contacts Tab */}
						<TabsContent
							value="contacts"
							className="p-5 mt-0"
						>
							{BRAND.features.companyTools && (
								<div className="flex items-center justify-between gap-3 mb-3">
									<p className="text-xs text-muted-foreground">Find the right person to email here: their website first, then Hunter.</p>
									<Button size="sm" variant="outline" onClick={handleFindContact} disabled={findingContact} className="gap-1.5 rounded-full shrink-0">
										{findingContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserSearch className="w-3.5 h-3.5" />}
										{findingContact ? 'Searching...' : 'Find contact'}
									</Button>
								</div>
							)}
							{loadingContacts ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
								</div>
							) : contacts.length === 0 ? (
								<div className="text-center py-12">
									<div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
										<User className="w-7 h-7 text-muted-foreground" />
									</div>
									<h3 className="font-semibold text-foreground mb-1">
										No linked contacts
									</h3>
									<p className="text-sm text-muted-foreground max-w-xs mx-auto">
										Link contacts to this company from the Contacts page to see
										them here
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{contacts.map((c) => (
										<div
											key={c.id}
											className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-all duration-200 group"
										>
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center text-xs font-bold border border-primary/10">
												{c.first_name[0]}
												{c.last_name[0]}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold text-foreground">
													{c.first_name} {c.last_name}
												</p>
												<div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
													{c.email && (
														<span className="flex items-center gap-1 truncate">
															<Mail className="w-3 h-3" />
															{c.email}
														</span>
													)}
													{c.phone && (
														<span className="flex items-center gap-1">
															<Phone className="w-3 h-3" />
															{c.phone}
														</span>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												{c.status && (
													<Badge
														variant="outline"
														className={cn(
															'text-[10px] font-medium',
															statusColors[c.status] || statusColors.Lead,
														)}
													>
														{c.status}
													</Badge>
												)}
												{c.lead_score != null && (
													<div
														className={cn(
															'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
															c.lead_score >= 70
																? 'bg-emerald-500/10 text-emerald-600'
																: c.lead_score >= 40
																	? 'bg-amber-500/10 text-amber-600'
																	: 'bg-red-500/10 text-red-600',
														)}
													>
														{c.lead_score}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</TabsContent>

						{/* Revenue Map Tab */}
						<TabsContent
							value="revenue"
							className="p-5 mt-0"
						>
							{BRAND.features.accountGrowth && company && (
								<div className="mb-5"><AccountGrowthPanel clientId={company.client_id} companyId={company.id} /></div>
							)}
							{loadingDeals ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
								</div>
							) : (
								(() => {
									const wonDeals = deals.filter((d) => d.stage === 'Won');
									const activeDeals = deals.filter(
										(d) => d.stage && d.stage !== 'Won',
									);
									const totalRevenue = wonDeals.reduce(
										(s, d) => s + (d.value || 0),
										0,
									);
									const totalPipeline = activeDeals.reduce(
										(s, d) => s + (d.value || 0),
										0,
									);
									const totalValue = deals.reduce(
										(s, d) => s + (d.value || 0),
										0,
									);
									const winRate =
										deals.length > 0
											? Math.round((wonDeals.length / deals.length) * 100)
											: 0;

									// Group deals by contact
									const contactDealMap = new Map<
										string,
										{ contact: string; deals: Deal[] }
									>();
									for (const d of deals) {
										const key = d.contact_id || 'unlinked';
										const name = d.contact_name || 'Unlinked Deals';
										if (!contactDealMap.has(key))
											contactDealMap.set(key, { contact: name, deals: [] });
										contactDealMap.get(key)!.deals.push(d);
									}

									// Stage progression
									const stageOrder = [
										'New Lead',
										'Contacted',
										'Qualified',
										'Proposal Sent',
										'Won',
									];
									const stageCounts = stageOrder.map((s) => ({
										stage: s,
										count: deals.filter((d) => d.stage === s).length,
										value: deals
											.filter((d) => d.stage === s)
											.reduce((sum, d) => sum + (d.value || 0), 0),
									}));

									const stageColors: Record<string, string> = {
										'New Lead': 'bg-blue-500',
										Contacted: 'bg-cyan-500',
										Qualified: 'bg-amber-500',
										'Proposal Sent': 'bg-ember-500',
										Won: 'bg-emerald-500',
									};
									const stageBgColors: Record<string, string> = {
										'New Lead': 'bg-blue-500/10 text-blue-600 border-blue-200',
										Contacted: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
										Qualified:
											'bg-amber-500/10 text-amber-600 border-amber-200',
										'Proposal Sent':
											'bg-ember-500/10 text-ember-600 border-ember-200',
										Won: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
									};

									if (deals.length === 0) {
										return (
											<div className="text-center py-12">
												<div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
													<BarChart3 className="w-7 h-7 text-muted-foreground" />
												</div>
												<h3 className="font-semibold text-foreground mb-1">
													No deals yet
												</h3>
												<p className="text-sm text-muted-foreground max-w-xs mx-auto">
													Create deals linked to this company in Pipeline to see
													the revenue map
												</p>
											</div>
										);
									}

									return (
										<div className="space-y-5">
											{/* Revenue Summary Cards */}
											<div className="grid grid-cols-3 gap-3">
												<div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-200/50 text-center">
													<Trophy className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
													<p className="text-lg font-bold text-emerald-600">
														${totalRevenue.toLocaleString()}
													</p>
													<p className="text-[10px] text-muted-foreground">
														Revenue Won
													</p>
												</div>
												<div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-center">
													<TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
													<p className="text-lg font-bold text-primary">
														${totalPipeline.toLocaleString()}
													</p>
													<p className="text-[10px] text-muted-foreground">
														Active Pipeline
													</p>
												</div>
												<div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-200/50 text-center">
													<Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
													<p className="text-lg font-bold text-amber-600">
														{winRate}%
													</p>
													<p className="text-[10px] text-muted-foreground">
														Win Rate
													</p>
												</div>
											</div>

											{/* Pipeline Funnel */}
											<Card className="overflow-hidden border">
												<div className="h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500" />
												<CardContent className="p-4">
													<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
														Pipeline Funnel
													</h4>
													<div className="space-y-2">
														{stageCounts
															.filter((s) => s.count > 0)
															.map((s, i) => {
																const maxVal = Math.max(
																	...stageCounts.map((sc) => sc.value),
																	1,
																);
																const widthPct = Math.max(
																	(s.value / maxVal) * 100,
																	8,
																);
																return (
																	<div
																		key={s.stage}
																		className="flex items-center gap-3"
																	>
																		<div className="w-24 text-right">
																			<span className="text-[11px] font-medium text-foreground">
																				{s.stage}
																			</span>
																		</div>
																		<div className="flex-1 h-7 bg-muted/30 rounded-full overflow-hidden relative">
																			<div
																				className={cn(
																					'h-full rounded-full flex items-center transition-all duration-500',
																					stageColors[s.stage] || 'bg-primary',
																				)}
																				style={{ width: `${widthPct}%` }}
																			>
																				<span className="text-[10px] font-bold text-white ml-2 whitespace-nowrap">
																					{s.count} deal
																					{s.count !== 1 ? 's' : ''}
																				</span>
																			</div>
																		</div>
																		<span className="text-xs font-semibold text-foreground w-20 text-right">
																			${s.value.toLocaleString()}
																		</span>
																	</div>
																);
															})}
													</div>
												</CardContent>
											</Card>

											{/* Connection Map: Company → Contacts → Deals */}
											<Card className="overflow-hidden border">
												<div className="h-1 bg-gradient-to-r from-primary/80 to-primary/20" />
												<CardContent className="p-4">
													<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
														Revenue Connection Map
													</h4>

													{/* Company node */}
													<div className="flex items-center gap-2 mb-4">
														<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-xs border border-primary/10">
															<Building2 className="w-5 h-5" />
														</div>
														<div>
															<p className="text-sm font-bold text-foreground">
																{company.name}
															</p>
															<p className="text-[10px] text-muted-foreground">
																{deals.length} deals / $
																{totalValue.toLocaleString()} total
															</p>
														</div>
													</div>

													{/* Contact → Deal branches */}
													<div className="ml-3 border-l-2 border-primary/20 pl-0">
														{[...contactDealMap.entries()].map(
															(
																[contactKey, { contact, deals: cDeals }],
																ci,
															) => {
																const contactRevenue = cDeals
																	.filter((d) => d.stage === 'Won')
																	.reduce((s, d) => s + (d.value || 0), 0);
																const contactPipeline = cDeals
																	.filter((d) => d.stage !== 'Won')
																	.reduce((s, d) => s + (d.value || 0), 0);
																return (
																	<div
																		key={contactKey}
																		className="relative ml-4 mb-4 last:mb-0"
																	>
																		{/* Connector line */}
																		<div className="absolute -left-[18px] top-4 w-4 border-t-2 border-primary/20" />
																		<div className="absolute -left-[19px] top-3 w-2.5 h-2.5 rounded-full bg-primary/30 border-2 border-card" />

																		{/* Contact card */}
																		<div className="p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
																			<div className="flex items-center gap-2.5 mb-2">
																				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/10">
																					{contactKey === 'unlinked' ? (
																						<Briefcase className="w-3.5 h-3.5" />
																					) : (
																						contact
																							.split(' ')
																							.map((w) => w[0])
																							.join('')
																							.substring(0, 2)
																					)}
																				</div>
																				<div className="flex-1 min-w-0">
																					<p className="text-xs font-semibold text-foreground truncate">
																						{contact}
																					</p>
																					<p className="text-[10px] text-muted-foreground">
																						{cDeals.length} deal
																						{cDeals.length !== 1 ? 's' : ''}
																					</p>
																				</div>
																				<div className="text-right">
																					{contactRevenue > 0 && (
																						<p className="text-xs font-bold text-emerald-600">
																							${contactRevenue.toLocaleString()}
																						</p>
																					)}
																					{contactPipeline > 0 && (
																						<p className="text-[10px] text-muted-foreground">
																							$
																							{contactPipeline.toLocaleString()}{' '}
																							in pipeline
																						</p>
																					)}
																				</div>
																			</div>

																			{/* Deal list for this contact */}
																			<div className="space-y-1.5 ml-10">
																				{cDeals.map((deal) => (
																					<div
																						key={deal.id}
																						className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-muted/20"
																					>
																						<CircleDot
																							className={cn(
																								'w-3 h-3 shrink-0',
																								deal.stage === 'Won'
																									? 'text-emerald-500'
																									: deal.stage ===
																										  'Proposal Sent'
																										? 'text-ember-500'
																										: deal.stage === 'Qualified'
																											? 'text-amber-500'
																											: 'text-blue-500',
																							)}
																						/>
																						<span className="text-[11px] font-medium text-foreground flex-1 truncate">
																							{deal.title}
																						</span>
																						<Badge
																							variant="outline"
																							className={cn(
																								'text-[9px] px-1.5 py-0',
																								stageBgColors[
																									deal.stage || ''
																								] || '',
																							)}
																						>
																							{deal.stage}
																						</Badge>
																						<span className="text-[11px] font-semibold text-foreground">
																							$
																							{(
																								deal.value || 0
																							).toLocaleString()}
																						</span>
																					</div>
																				))}
																			</div>
																		</div>
																	</div>
																);
															},
														)}
													</div>
												</CardContent>
											</Card>

											{/* Recent Won Deals */}
											{wonDeals.length > 0 && (
												<Card className="border border-emerald-200/50">
													<CardContent className="p-4">
														<h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
															<Trophy className="w-3.5 h-3.5" />
															Closed Won ({wonDeals.length})
														</h4>
														<div className="space-y-2">
															{wonDeals.map((d) => (
																<div
																	key={d.id}
																	className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5"
																>
																	<div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
																		<DollarSign className="w-3.5 h-3.5 text-emerald-600" />
																	</div>
																	<div className="flex-1 min-w-0">
																		<p className="text-xs font-semibold text-foreground truncate">
																			{d.title}
																		</p>
																		{d.contact_name && (
																			<p className="text-[10px] text-muted-foreground">
																				{d.contact_name}
																			</p>
																		)}
																	</div>
																	<span className="text-sm font-bold text-emerald-600">
																		${(d.value || 0).toLocaleString()}
																	</span>
																</div>
															))}
														</div>
													</CardContent>
												</Card>
											)}
										</div>
									);
								})()
							)}
						</TabsContent>

						{/* Visual Insights Tab */}
						<TabsContent
							value="visual"
							className="p-4 mt-0"
						>
							{!analysis ? (
								<div className="text-center py-12">
									<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
										<BarChart3 className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-lg font-bold text-foreground mb-1">
										No data to visualize
									</h3>
									<p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
										Run AI analysis first to unlock the visual intelligence
										dashboard
									</p>
									<Button
										onClick={() => onAnalyze(company)}
										disabled={analyzing}
										className="gap-2 rounded-full"
									>
										{analyzing ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<BarChart3 className="w-4 h-4" />
										)}
										Run Analysis
									</Button>
								</div>
							) : (
								<CompanyInsightVisual
									analysis={analysis}
									company={company}
								/>
							)}
						</TabsContent>

						{/* Analysis Tab */}
						<TabsContent
							value="analysis"
							className="p-5 space-y-4 mt-0"
						>
							{!analysis && knowledgePages.length === 0 ? (
								<div className="text-center py-12">
									<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
										<Brain className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-lg font-bold text-foreground mb-1">
										No analysis yet
									</h3>
									<p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
										Run AI analysis to get actionable insights on segment,
										prospects, strategy, and more
									</p>
									<Button
										onClick={() => onAnalyze(company)}
										disabled={analyzing}
										className="gap-2 rounded-full"
									>
										{analyzing ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<BotIcon className="w-4 h-4" />
										)}
										Run Analysis
									</Button>
								</div>
							) : !analysis ? (
								<div className="text-center py-8">
									<p className="text-sm text-muted-foreground mb-4">
										{knowledgePages.length} pages scraped. Run AI analysis for
										insights.
									</p>
									<Button
										onClick={() => onAnalyze(company)}
										disabled={analyzing}
										className="gap-2 rounded-full"
									>
										{analyzing ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<BotIcon className="w-4 h-4" />
										)}
										Run Analysis
									</Button>
								</div>
							) : (
								<>
									{/* Company Summary (from website content) */}
									{analysis.company_summary && (
										<Card className="overflow-hidden border-primary/20">
											<div className="h-1 bg-gradient-to-r from-primary/80 to-primary/20" />
											<CardContent className="p-5">
												<h4 className="text-sm font-bold flex items-center gap-2 mb-3">
													<Building2 className="w-4 h-4 text-primary" />
													Company Overview
												</h4>
												<p className="text-xs text-muted-foreground leading-relaxed mb-3">
													{analysis.company_summary.overview}
												</p>
												{analysis.company_summary.key_services?.length > 0 && (
													<div className="mb-3">
														<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
															Key Services
														</p>
														<div className="flex flex-wrap gap-1.5">
															{analysis.company_summary.key_services.map(
																(s: string, i: number) => (
																	<Badge
																		key={i}
																		variant="outline"
																		className="text-[10px] bg-primary/5 border-primary/20"
																	>
																		{s}
																	</Badge>
																),
															)}
														</div>
													</div>
												)}
												{analysis.company_summary.target_audience && (
													<div className="mb-3">
														<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
															Target Audience
														</p>
														<p className="text-xs text-foreground">
															{analysis.company_summary.target_audience}
														</p>
													</div>
												)}
												{analysis.company_summary.unique_selling_points
													?.length > 0 && (
													<div>
														<p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-1.5">
															Unique Selling Points
														</p>
														<div className="space-y-1">
															{analysis.company_summary.unique_selling_points.map(
																(u: string, i: number) => (
																	<p
																		key={i}
																		className="text-xs text-foreground flex items-start gap-2"
																	>
																		<Star className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
																		<span>{u}</span>
																	</p>
																),
															)}
														</div>
													</div>
												)}
												{analysis.company_summary.estimated_team_size && (
													<p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
														<Users className="w-3 h-3" />
														Estimated team:{' '}
														{analysis.company_summary.estimated_team_size}
													</p>
												)}
											</CardContent>
										</Card>
									)}

									{analysis.prospect_score && (
										<Card className="overflow-hidden border-primary/20">
											<div className="h-1 bg-gradient-to-r from-primary to-primary/40" />
											<CardContent className="p-5">
												<div className="flex items-center justify-between mb-3">
													<h4 className="text-sm font-bold flex items-center gap-2">
														<Target className="w-4 h-4 text-primary" />
														Prospect Score
													</h4>
													<div
														className={cn(
															'text-2xl font-black',
															analysis.prospect_score.score >= 70
																? 'text-emerald-600'
																: analysis.prospect_score.score >= 40
																	? 'text-amber-600'
																	: 'text-red-600',
														)}
													>
														{analysis.prospect_score.score}
														<span className="text-sm font-normal text-muted-foreground">
															/100
														</span>
													</div>
												</div>
												<p className="text-xs text-muted-foreground mb-3">
													{analysis.prospect_score.recommendation}
												</p>
												<div className="flex flex-wrap gap-1.5">
													{analysis.prospect_score.factors?.map(
														(f: string, i: number) => (
															<Badge
																key={i}
																variant="outline"
																className="text-[10px] bg-primary/5 border-primary/20"
															>
																{f}
															</Badge>
														),
													)}
												</div>
											</CardContent>
										</Card>
									)}

									{analysis.market_segment && (
										<Card className="border">
											<CardContent className="p-5">
												<h4 className="text-sm font-bold flex items-center gap-2 mb-3">
													<BarChart3 className="w-4 h-4 text-primary" />
													Market Segment
												</h4>
												<p className="text-sm font-semibold text-foreground">
													{analysis.market_segment.classification}
												</p>
												<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
													{analysis.market_segment.reasoning}
												</p>
												<Badge
													variant="outline"
													className="mt-3 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200"
												>
													Growth: {analysis.market_segment.growth_potential}
												</Badge>
											</CardContent>
										</Card>
									)}

									{analysis.industry_insights && (
										<Card className="border">
											<CardContent className="p-5">
												<h4 className="text-sm font-bold flex items-center gap-2 mb-4">
													<TrendingUp className="w-4 h-4 text-primary" />
													Industry Insights
												</h4>
												<div className="space-y-4">
													{analysis.industry_insights.trends?.length > 0 && (
														<div>
															<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
																Trends
															</p>
															<div className="space-y-1.5">
																{analysis.industry_insights.trends.map(
																	(t: string, i: number) => (
																		<p
																			key={i}
																			className="text-xs text-foreground flex items-start gap-2"
																		>
																			<span className="text-primary mt-0.5">
																				→
																			</span>
																			<span>{t}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
													{analysis.industry_insights.opportunities?.length >
														0 && (
														<div>
															<p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-2">
																Opportunities
															</p>
															<div className="space-y-1.5">
																{analysis.industry_insights.opportunities.map(
																	(o: string, i: number) => (
																		<p
																			key={i}
																			className="text-xs text-foreground flex items-start gap-2"
																		>
																			<span className="text-emerald-500 mt-0.5">
																				✓
																			</span>
																			<span>{o}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
													{analysis.industry_insights.challenges?.length >
														0 && (
														<div>
															<p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold mb-2">
																Challenges
															</p>
															<div className="space-y-1.5">
																{analysis.industry_insights.challenges.map(
																	(ch: string, i: number) => (
																		<p
																			key={i}
																			className="text-xs text-foreground flex items-start gap-2"
																		>
																			<span className="text-amber-500 mt-0.5">
																				⚠
																			</span>
																			<span>{ch}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									)}

									{analysis.communication_strategy && (
										<Card className="border">
											<CardContent className="p-5">
												<h4 className="text-sm font-bold flex items-center gap-2 mb-4">
													<MessageSquare className="w-4 h-4 text-primary" />
													Communication Strategy
												</h4>
												<div className="space-y-3 text-xs">
													<div className="grid grid-cols-2 gap-3">
														<div className="p-2.5 rounded-lg bg-muted/30">
															<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
																Tone
															</span>
															<p className="font-semibold text-foreground mt-0.5">
																{analysis.communication_strategy.tone}
															</p>
														</div>
														<div className="p-2.5 rounded-lg bg-muted/30">
															<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
																Best Time
															</span>
															<p className="font-semibold text-foreground mt-0.5">
																{
																	analysis.communication_strategy
																		.best_time_to_reach
																}
															</p>
														</div>
													</div>
													<div className="flex flex-wrap gap-1.5">
														{analysis.communication_strategy.preferred_channels?.map(
															(ch: string, i: number) => (
																<Badge
																	key={i}
																	variant="outline"
																	className="text-[10px]"
																>
																	{ch}
																</Badge>
															),
														)}
													</div>
													{analysis.communication_strategy.key_talking_points
														?.length > 0 && (
														<div className="mt-2">
															<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
																Talking Points
															</p>
															<div className="space-y-1.5">
																{analysis.communication_strategy.key_talking_points.map(
																	(tp: string, i: number) => (
																		<p
																			key={i}
																			className="flex items-start gap-2"
																		>
																			<span className="text-primary mt-0.5">
																				•
																			</span>
																			<span>{tp}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									)}

									{analysis.sales_strategy && (
										<Card className="border">
											<CardContent className="p-5">
												<h4 className="text-sm font-bold flex items-center gap-2 mb-3">
													<Target className="w-4 h-4 text-primary" />
													Sales Strategy
												</h4>
												<p className="text-xs text-muted-foreground mb-3 leading-relaxed">
													{analysis.sales_strategy.approach}
												</p>
												<div className="space-y-3 text-xs">
													{analysis.sales_strategy.value_propositions?.length >
														0 && (
														<div>
															<p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-2">
																Value Props
															</p>
															<div className="space-y-1.5">
																{analysis.sales_strategy.value_propositions.map(
																	(vp: string, i: number) => (
																		<p
																			key={i}
																			className="flex items-start gap-2"
																		>
																			<span className="text-emerald-500 mt-0.5">
																				✓
																			</span>
																			<span>{vp}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
													{analysis.sales_strategy.next_steps?.length > 0 && (
														<div>
															<p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
																Next Steps
															</p>
															<div className="space-y-1.5">
																{analysis.sales_strategy.next_steps.map(
																	(ns: string, i: number) => (
																		<p
																			key={i}
																			className="flex items-start gap-2"
																		>
																			<span className="text-primary font-bold mt-0.5">
																				{i + 1}.
																			</span>
																			<span>{ns}</span>
																		</p>
																	),
																)}
															</div>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									)}
								</>
							)}
						</TabsContent>

						{/* Knowledge Pages Tab */}
						<TabsContent
							value="knowledge"
							className="p-5 mt-0"
						>
							{knowledgePages.length === 0 ? (
								<div className="text-center py-12">
									<div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
										<FileText className="w-7 h-7 text-muted-foreground" />
									</div>
									<h3 className="font-semibold text-foreground mb-1">
										No scraped pages
									</h3>
									<p className="text-sm text-muted-foreground max-w-xs mx-auto">
										Scrape this company's website to collect page content for AI
										analysis
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{knowledgePages.map((page) => {
										const isExpanded = expandedPage === page.id;
										const pageTypeColors: Record<string, string> = {
											homepage: 'bg-blue-500/10 text-blue-600',
											about: 'bg-ember-500/10 text-ember-600',
											team: 'bg-emerald-500/10 text-emerald-600',
											services: 'bg-amber-500/10 text-amber-600',
											contact: 'bg-cyan-500/10 text-cyan-600',
											careers: 'bg-ember-500/10 text-ember-600',
											pricing: 'bg-orange-500/10 text-orange-600',
											portfolio: 'bg-ember-500/10 text-ember-600',
											faq: 'bg-teal-500/10 text-teal-600',
											blog: 'bg-rose-500/10 text-rose-600',
											general: 'bg-muted text-muted-foreground',
										};
										return (
											<div
												key={page.id}
												className="border rounded-xl overflow-hidden bg-card"
											>
												<button
													onClick={() =>
														setExpandedPage(isExpanded ? null : page.id)
													}
													className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/20 transition-colors text-left"
												>
													<FileText className="w-4 h-4 text-muted-foreground shrink-0" />
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-foreground truncate">
															{page.page_title || page.page_url}
														</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{page.page_url}
														</p>
													</div>
													<Badge
														variant="outline"
														className={cn(
															'text-[10px] shrink-0',
															pageTypeColors[page.page_type] ||
																pageTypeColors.general,
														)}
													>
														{page.page_type}
													</Badge>
													{isExpanded ? (
														<ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
													) : (
														<ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
													)}
												</button>
												{isExpanded && (
													<div className="px-4 pb-4 border-t">
														<pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-3 max-h-64 overflow-y-auto">
															{page.content?.substring(0, 3000) || 'No content'}
															{page.content?.length > 3000 &&
																'\n\n... (truncated)'}
														</pre>
														<div className="flex items-center gap-2 mt-3">
															<a
																href={page.page_url}
																target="_blank"
																rel="noopener"
															>
																<Button
																	variant="outline"
																	size="sm"
																	className="gap-1.5 text-xs rounded-full"
																>
																	<ExternalLink className="w-3 h-3" />
																	Visit Page
																</Button>
															</a>
															<span className="text-[10px] text-muted-foreground">
																Scraped{' '}
																{new Date(page.scraped_at).toLocaleDateString()}
															</span>
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</TabsContent>

						{/* Governance Tab */}
						{BRAND.features.prospector && prospectLeads.length > 0 && (
							<TabsContent value="signals" className="p-5 mt-0 space-y-4">
								<p className="text-xs text-muted-foreground">Why the Lead Prospector found this company: each buying signal, and the page it came from.</p>
								{prospectLeads.map((l) => (
									<div key={l.id} className="rounded-xl border bg-card p-4 space-y-3">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="text-[11px] text-muted-foreground">
													Found {new Date(l.prospected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
													{l.fit_score != null && <> · fit {l.fit_score}</>}
												</div>
												<div className="text-sm font-semibold text-foreground">{l.trigger_event || l.company_name}</div>
											</div>
											<span className={cn('px-2 py-0.5 rounded-full text-xs font-bold shrink-0',
												l.intent_score >= 70 ? 'bg-emerald-100 text-emerald-700' : l.intent_score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground')}>
												{l.intent_score}
											</span>
										</div>
										{l.talking_point && (
											<div className="rounded-lg bg-primary/5 p-3 text-sm">
												<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Opening line</div>
												{l.talking_point}
											</div>
										)}
										{(l.signals || []).length > 0 && (
											<div className="space-y-2">
												{l.signals.map((sg: any, i: number) => (
													<div key={i} className="flex items-start justify-between gap-3 rounded-lg border p-2.5">
														<div className="min-w-0">
															<div className="text-[11px] text-muted-foreground">
																{SIGNAL_NAMES[sg.signal_type] || sg.signal_type} · {new Date(sg.observed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
															</div>
															<div className="text-sm text-foreground">{sg.label}</div>
															{sg.detail?.pain_points?.length > 0 && (
																<ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{sg.detail.pain_points.map((p: string) => <li key={p}>{p}</li>)}</ul>
															)}
															{sg.detail?.reason && <p className="mt-1 text-xs text-muted-foreground">{sg.detail.reason}</p>}
														</div>
														<div className="flex items-center gap-2 shrink-0">
															<span className="text-xs font-semibold">{sg.strength}</span>
															{sg.source_url && /^https?:/.test(sg.source_url) && (
																<a href={sg.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Source">
																	<ExternalLink className="w-3.5 h-3.5" />
																</a>
															)}
														</div>
													</div>
												))}
											</div>
										)}
										{l.snippet && (
											<div>
												<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Snippet</div>
												<p className="text-xs text-muted-foreground">{l.snippet}</p>
											</div>
										)}
										{l.source_url && /^https?:/.test(l.source_url) && (
											<a href={l.source_url.replace(/#.*$/, '')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
												Where it was found <ExternalLink className="w-3 h-3" />
											</a>
										)}
									</div>
								))}
							</TabsContent>
						)}

						<TabsContent value="governance" className="p-5 mt-0 space-y-5">
							{/* Header row */}
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
										<ShieldCheck className="w-4 h-4 text-primary" />
										{COPY.governanceTitle}
									</h3>
									<p className="text-xs text-muted-foreground mt-0.5 max-w-md">
										{COPY.governanceIntro}
									</p>
								</div>
								<Button
									size="sm"
									variant={governanceStatus === 'done' ? 'outline' : 'default'}
									onClick={startGovernanceProfile}
									disabled={governanceStatus === 'running'}
									className="gap-1.5 text-xs rounded-full"
								>
									{governanceStatus === 'running' ? (
										<><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</>
									) : governanceStatus === 'done' ? (
										<><RefreshCw className="w-3 h-3" />Re-run</>
									) : (
										<><ShieldCheck className="w-3 h-3" />Run Analysis</>
									)}
								</Button>
							</div>

							{/* Running state */}
							{governanceStatus === 'running' && (
								<div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-6 text-center">
									<Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
									<p className="text-sm font-medium text-foreground">Analysis in progress</p>
									<p className="text-xs text-muted-foreground mt-1 italic">
										This typically takes 2–5 minutes.
									</p>
								</div>
							)}

							{/* Failed state */}
							{governanceStatus === 'failed' && (
								<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
									<AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-medium text-destructive">Analysis failed</p>
										<p className="text-xs text-muted-foreground mt-0.5">
											Click Re-run to try again.
										</p>
									</div>
								</div>
							)}

							{/* Idle (never run) */}
							{governanceStatus === 'idle' && (
								<div className="text-center py-10">
									<div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
										<ShieldCheck className="w-7 h-7 text-muted-foreground" />
									</div>
									<h3 className="font-semibold text-foreground mb-1">No analysis on file</h3>
									<p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
										{COPY.governanceEmpty}
									</p>
									<Button onClick={startGovernanceProfile} className="gap-2">
										<ShieldCheck className="w-4 h-4" />Run Analysis
									</Button>
								</div>
							)}

							{/* Results */}
							{governanceStatus === 'done' && governanceProfile && (() => {
								const gp = governanceProfile;
								const pi = gp.preliminary_indicators ?? {};
								const si = gp.scoring_inputs ?? {};
								const conf = pi.data_confidence ?? 'low';
								const fb = gp.forensic_brief ?? null;
								const posture = fb?.preliminary_posture ?? 'INSUFFICIENT_DATA';

								// ── AGRC Classification System ────────────────────────────
								// GD (Governance Disclosure): higher = better → A is best
								// PD (Provenance Debt):        lower  = better → A is best
								// SI (Shadow IT Signal):       lower  = better → A is best
								type AgrcTier = 'A' | 'B' | 'C' | 'D' | 'E';
								const gdTier = (s: number | null): AgrcTier => {
									if (s === null) return 'E';
									if (s >= 70) return 'A';
									if (s >= 45) return 'B';
									if (s >= 25) return 'C';
									if (s >= 10) return 'D';
									return 'E';
								};
								const riskTier = (s: number | null): AgrcTier => {
									if (s === null) return 'E';
									if (s <= 15) return 'A';
									if (s <= 35) return 'B';
									if (s <= 55) return 'C';
									if (s <= 75) return 'D';
									return 'E';
								};
								const tierLabel: Record<AgrcTier, string> = {
									A: 'Compliant', B: 'Adequate', C: 'Developing', D: 'Deficient', E: 'Critical',
								};
								const tierColor: Record<AgrcTier, string> = {
									A: 'text-emerald-700 bg-emerald-500/10 border-emerald-200',
									B: 'text-teal-700 bg-teal-500/10 border-teal-200',
									C: 'text-amber-700 bg-amber-500/10 border-amber-200',
									D: 'text-orange-700 bg-orange-500/10 border-orange-200',
									E: 'text-red-700 bg-red-500/10 border-red-200',
								};
								const tierBar: Record<AgrcTier, string> = {
									A: 'bg-emerald-500', B: 'bg-teal-500', C: 'bg-amber-400',
									D: 'bg-orange-500', E: 'bg-red-500',
								};

								const gdScore = si.governance_disclosure?.score ?? null;
								const pdScore = si.provenance_debt?.score ?? null;
								const siScore = si.shadow_it?.score ?? null;

								const gdCode = gdTier(gdScore);
								const pdCode = riskTier(pdScore);
								const siCode = riskTier(siScore);

								const agrcRating =
									posture === 'GREEN' ? 'AGRC-1'
									: posture === 'YELLOW' ? 'AGRC-2'
									: posture === 'RED' ? 'AGRC-3'
									: 'AGRC-ND';

								const agrcConfig: Record<string, { bg: string; border: string; text: string; sub: string }> = {
									'AGRC-1': { bg: 'bg-emerald-500/8', border: 'border-emerald-300', text: 'text-emerald-700', sub: 'Forensically Defensible Posture' },
									'AGRC-2': { bg: 'bg-amber-500/8',   border: 'border-amber-300',   text: 'text-amber-700',   sub: 'Governance Gaps Identified' },
									'AGRC-3': { bg: 'bg-red-500/8',     border: 'border-red-300',     text: 'text-red-700',     sub: 'High Regulatory Liability Exposure' },
									'AGRC-ND': { bg: 'bg-slate-500/8',  border: 'border-slate-300',   text: 'text-slate-600',   sub: 'Insufficient Data for Classification' },
								};
								const ac = agrcConfig[agrcRating];

								const FactorRow = ({
									code, prefix, label, score, isRisk,
								}: { code: AgrcTier; prefix: string; label: string; score: number | null; isRisk: boolean }) => {
									const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0;
									return (
										<div className="space-y-1.5">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<span className="font-mono text-[11px] font-bold text-foreground tracking-widest">{prefix}-{code}</span>
													<span className="text-[11px] text-muted-foreground">{label}</span>
												</div>
												<Badge variant="outline" className={cn('text-[10px] font-medium', tierColor[code])}>
													{tierLabel[code]}
												</Badge>
											</div>
											{score !== null ? (
												<div className="h-1 rounded-full bg-muted overflow-hidden">
													<div className={cn('h-full rounded-full transition-all', tierBar[code])} style={{ width: `${pct}%` }} />
												</div>
											) : (
												<div className="h-1 rounded-full bg-muted/40" />
											)}
										</div>
									);
								};

								const confBadge =
									conf === 'high' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
									: conf === 'medium' ? 'bg-amber-500/10 text-amber-700 border-amber-200'
									: 'bg-slate-500/10 text-slate-600 border-slate-200';
								const confLabel =
									conf === 'high' ? 'High Assurance'
									: conf === 'medium' ? 'Medium Assurance'
									: 'Low Assurance';

								return (
									<div className="space-y-4">
										{/* AGRC Rating Card */}
										<div className={cn('rounded-xl border p-4 space-y-3', ac.bg, ac.border)}>
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="flex items-baseline gap-2">
														<span className={cn('font-mono text-2xl font-black tracking-tight', ac.text)}>{agrcRating}</span>
														<span className={cn('text-xs font-semibold', ac.text)}>{ac.sub}</span>
													</div>
													{fb?.posture_rationale && (
														<p className="text-xs text-muted-foreground mt-1 leading-relaxed">{fb.posture_rationale}</p>
													)}
												</div>
												<div className="flex flex-col items-end gap-1 shrink-0">
													<Badge variant="outline" className={cn('text-[10px]', confBadge)}>{confLabel}</Badge>
													{fb?.generated_at && (
														<span className="text-[10px] text-muted-foreground">
															{new Date(fb.generated_at).toLocaleDateString()}
														</span>
													)}
												</div>
											</div>
											{fb?.executive_summary && (
												<div className="rounded-lg bg-background/60 p-3 border border-border/40">
													<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Assessment</p>
													<p className="text-xs text-foreground leading-relaxed">{fb.executive_summary}</p>
												</div>
											)}
										</div>

										{/* Four-factor classification */}
										<Card className="border bg-card">
											<CardContent className="p-4 space-y-4">
												<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Factor Classification</p>
												<FactorRow code={gdCode} prefix="GD" label="Governance Disclosure" score={gdScore} isRisk={false} />
												<FactorRow code={pdCode} prefix="PD" label="Provenance Debt Ratio" score={pdScore} isRisk={true} />
												<FactorRow code={siCode} prefix="SI" label="Shadow IT Divergence" score={siScore} isRisk={true} />
												<div className="space-y-1.5">
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															<span className="font-mono text-[11px] font-bold text-foreground tracking-widest">OD</span>
															<span className="text-[11px] text-muted-foreground">Operational Drift</span>
														</div>
														<Badge variant="outline" className="text-[10px] font-medium bg-muted text-muted-foreground border-border">
															Requires Re-scan
														</Badge>
													</div>
													<div className="h-1 rounded-full bg-muted/40" />
												</div>
											</CardContent>
										</Card>

										{/* Factor findings */}
										{fb?.factor_findings?.length > 0 && (
											<div className="space-y-2">
												<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Findings</p>
												{fb.factor_findings.map((f: any) => {
													const fCode = f.factor === 'Governance Disclosure' ? `GD-${gdCode}`
														: f.factor === 'Provenance Debt Ratio' ? `PD-${pdCode}`
														: f.factor === 'Shadow IT Signal' ? `SI-${siCode}`
														: 'OD';
														const fLabel = f.factor === 'Shadow IT Signal' ? 'Shadow IT Divergence' : f.factor;
													return (
														<div key={f.factor} className="rounded-lg border bg-card p-3 space-y-1.5">
															<div className="flex items-center justify-between gap-2">
																<div className="flex items-center gap-2">
																	<span className="font-mono text-[11px] font-bold text-foreground tracking-widest">{fCode}</span>
																	<span className="text-xs font-medium text-foreground">{fLabel}</span>
																</div>
																{f.rating && (
																	<Badge variant="outline" className={cn('text-[10px] capitalize shrink-0',
																		f.rating === 'strong' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
																		: f.rating === 'moderate' ? 'bg-amber-500/10 text-amber-700 border-amber-200'
																		: 'bg-red-500/10 text-red-700 border-red-200')}>
																		{f.rating}
																	</Badge>
																)}
															</div>
															<p className="text-[11px] text-muted-foreground leading-relaxed">{f.finding}</p>
															{f.evidence?.length > 0 && (
																<ul className="mt-1 space-y-0.5">
																	{f.evidence.map((e: string, i: number) => (
																		<li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
																			<span className="mt-0.5 shrink-0 opacity-50">›</span>{e}
																		</li>
																	))}
																</ul>
															)}
														</div>
													);
												})}
											</div>
										)}

										{/* Risks & strengths */}
										<div className="grid grid-cols-2 gap-2">
											{fb?.key_risks?.length > 0 && (
												<div className="rounded-lg bg-red-500/5 border border-red-200 p-3 space-y-1">
													<p className="text-[10px] font-semibold text-red-700 uppercase tracking-widest flex items-center gap-1">
														<AlertTriangle className="w-3 h-3" />Risk Factors
													</p>
													{fb.key_risks.map((r: string, i: number) => (
														<p key={i} className="text-[11px] text-red-700 leading-snug flex items-start gap-1">
															<span className="mt-0.5 shrink-0">›</span>{r}
														</p>
													))}
												</div>
											)}
											{fb?.key_strengths?.length > 0 && (
												<div className="rounded-lg bg-emerald-500/5 border border-emerald-200 p-3 space-y-1">
													<p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest flex items-center gap-1">
														<ShieldCheck className="w-3 h-3" />Mitigating Factors
													</p>
													{fb.key_strengths.map((s: string, i: number) => (
														<p key={i} className="text-[11px] text-emerald-700 leading-snug flex items-start gap-1">
															<span className="mt-0.5 shrink-0">›</span>{s}
														</p>
													))}
												</div>
											)}
										</div>

										{/* Recommended actions */}
										{fb?.recommended_follow_up?.length > 0 && (
											<div className="space-y-1.5">
												<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recommended Actions</p>
												{fb.recommended_follow_up.map((r: string, i: number) => (
													<p key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
														<span className="font-mono font-bold mt-0.5 shrink-0 text-foreground/40">{String(i + 1).padStart(2, '0')}</span>{r}
													</p>
												))}
											</div>
										)}

										{/* Intelligence details grid */}
										<div className="grid grid-cols-3 gap-2">
											{[
												{ label: 'Policy Status', value: si.governance_disclosure?.has_policy_page ? 'Identified' : 'Not Found' },
												{ label: 'SEC Disclosure', value: si.governance_disclosure?.sec_disclosure_quality === 'unavailable' ? '—' : (si.governance_disclosure?.sec_disclosure_quality ?? '—') },
												{ label: 'Compliance Citations', value: si.governance_disclosure?.compliance_frameworks_count ?? 0 },
												{ label: 'Shadow Tools', value: si.shadow_it?.undisclosed_tools?.length ?? 0 },
												{ label: 'Governance Roles', value: si.shadow_it?.governance_roles_count ?? 0 },
												{ label: 'Media Controversies', value: si.news_risk?.controversy_count ?? 0 },
											].map(({ label, value }) => (
												<div key={label} className="rounded-lg bg-muted/40 p-3">
													<p className="text-[10px] text-muted-foreground leading-snug">{label}</p>
													<p className="text-sm font-semibold text-foreground mt-0.5">{String(value)}</p>
												</div>
											))}
										</div>

										{/* Coverage limitations */}
										{fb?.data_gaps?.length > 0 && (
											<div className="rounded-lg bg-muted/40 p-3 space-y-1">
												<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Coverage Limitations</p>
												{fb.data_gaps.map((g: string, i: number) => (
													<p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
														<span className="mt-0.5 shrink-0 opacity-50">›</span>{g}
													</p>
												))}
											</div>
										)}
									</div>
								);
							})()}
						</TabsContent>
					</Tabs>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
