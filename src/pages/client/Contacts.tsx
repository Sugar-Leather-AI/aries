import { useState, useEffect, useCallback, useRef } from 'react';
import ProspectScorecard from '@/components/ProspectScorecard';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Search, Filter, Upload, Plus, Loader2, UserPlus, ExternalLink, Zap, Trash2, UserSearch } from 'lucide-react';

/** Absolute link for a prospect's source page (adds https://; Google stubs go via google.com). */
function sourceHref(raw: string | null | undefined): string | null {
	let u = (raw || '').trim();
	if (!u) return null;
	try {
		// Google redirect stubs ("/goto?url=...", "/url?q=...") only work on google.com.
		if (u.startsWith('/')) return `https://www.google.com${u}`;
		if (!/^https?:\/\//i.test(u)) u = `https://${u.replace(/^\/+/, '')}`;
		const parsed = new URL(u);
		return parsed.hostname.includes('.') ? parsed.href : null;
	} catch {
		return null;
	}
}
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import ContactDetailPanel from '@/components/ContactDetailPanel';
import ContactCsvImportDialog from '@/components/ContactCsvImportDialog';
import { BRAND } from '@/brand';
import ProspectSignalsDialog, { SignalChips, type ScoreBreakdown } from '@/components/ProspectSignalsDialog';

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
	Lead: 'bg-info/10 text-info',
	Client: 'bg-success/10 text-success',
	Prospect: 'bg-warning/10 text-warning',
	Inactive: 'bg-muted text-muted-foreground',
};

const statusFilters = ['All', 'Lead', 'Prospect', 'Client', 'Inactive'];

interface Company {
	id: string;
	name: string;
	industry: string | null;
	website: string | null;
}
interface Contact {
	id: string;
	first_name: string;
	last_name: string;
	email: string | null;
	phone: string | null;
	status: string | null;
	lead_score: number | null;
	source: string | null;
	tags: string[] | null;
	last_contacted_at: string | null;
	company_id: string | null;
	client_id: string;
}

interface ProspectedLead {
	id: string;
	source_url: string;
	source_type: string;
	company_name: string | null;
	contact_name: string | null;
	contact_title: string | null;
	contact_email: string | null;
	company_domain?: string | null;
	email_verified?: boolean;
	email_source?: string | null;
	email_check?: string | null;
	trigger_event: string | null;
	intent_score: number;
	snippet: string | null;
	imported: boolean;
	prospected_at: string;
	fit_score?: number | null;
	fit_reason?: string | null;
	talking_point?: string | null;
	signal_count?: number;
	score_breakdown?: ScoreBreakdown | null;
	tech_stack?: { tools?: { name: string; category: string }[]; email_provider?: string | null } | null;
	company_address?: string | null;
	company_city?: string | null;
	company_state?: string | null;
	company_postal_code?: string | null;
	company_country?: string | null;
}

/** "12 Main St, Austin, TX 78701" from a prospected lead's address fields. */
const leadPlace = (l: ProspectedLead) =>
	[l.company_address, l.company_city, [l.company_state, l.company_postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');

const sourceTypeColors: Record<string, string> = {
	job_post: 'bg-blue-100 text-blue-700',
	news: 'bg-ember-100 text-ember-700',
	forum: 'bg-amber-100 text-amber-700',
	review: 'bg-emerald-100 text-emerald-700',
	social: 'bg-ember-100 text-ember-700',
	rfp: 'bg-violet-100 text-violet-700',
	filing: 'bg-emerald-100 text-emerald-700',
	other: 'bg-muted text-muted-foreground',
};

const Contacts = () => {
	const { user } = useAuth();
	const [activeTab, setActiveTab] = useState<'contacts' | 'prospects'>('contacts');
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');
	const [showFilters, setShowFilters] = useState(false);
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [totalCount, setTotalCount] = useState(0);
	const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
	const [showAdd, setShowAdd] = useState(false);
	const [showImport, setShowImport] = useState(false);
	const [saving, setSaving] = useState(false);
	const [prospects, setProspects] = useState<ProspectedLead[]>([]);
	const [prospectsLoading, setProspectsLoading] = useState(false);
	const [importingId, setImportingId] = useState<string | null>(null);
	const [findingIds, setFindingIds] = useState<Set<string>>(new Set());
	const searchTimer = useRef<ReturnType<typeof setTimeout>>();
	const [addForm, setAddForm] = useState({
		first_name: '',
		last_name: '',
		email: '',
		phone: '',
		status: 'Lead',
		source: '',
		company_id: null as string | null,
	});

	const buildQuery = useCallback(
		(from: number, to: number) => {
			let query = supabase
				.from('contacts')
				.select('*', { count: 'exact' })
				.order('created_at', { ascending: false })
				.range(from, to);

			if (statusFilter !== 'All') {
				query = query.eq('status', statusFilter);
			}
			if (search.trim()) {
				const q = `%${search.trim()}%`;
				query = query.or(
					`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`,
				);
			}
			return query;
		},
		[statusFilter, search],
	);

	const fetchContacts = useCallback(
		async (reset = true) => {
			if (reset) {
				setLoading(true);
				setContacts([]);
			} else {
				setLoadingMore(true);
			}

			const from = reset ? 0 : contacts.length;
			const to = from + PAGE_SIZE - 1;

			const { data, count, error } = await buildQuery(from, to);

			if (error) {
				toast.error('Failed to load contacts');
				setLoading(false);
				setLoadingMore(false);
				return;
			}

			const newContacts = (data as Contact[]) || [];
			if (reset) {
				setContacts(newContacts);
			} else {
				setContacts((prev) => [...prev, ...newContacts]);
			}
			setTotalCount(count || 0);
			setHasMore(from + newContacts.length < (count || 0));
			setLoading(false);
			setLoadingMore(false);
		},
		[buildQuery, contacts.length],
	);

	const fetchCompanies = async () => {
		const { data } = await supabase.from('companies').select('id, name, industry, website');
		if (data) setCompanies(data as any[]);
	};

	// Initial load
	useEffect(() => {
		fetchCompanies();
	}, []);

	// Re-fetch when filters change (debounced for search)
	useEffect(() => {
		fetchContacts(true);
	}, [statusFilter]);

	// Debounce search
	useEffect(() => {
		clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => {
			fetchContacts(true);
		}, 300);
		return () => clearTimeout(searchTimer.current);
	}, [search]);

	const handleAddContact = async () => {
		if (!addForm.first_name || !addForm.last_name) {
			toast.error('Name is required');
			return;
		}
		setSaving(true);
		try {
			const { data: clientId, error: ensureError } = await supabase.rpc(
				'ensure_user_client_id',
			);
			if (ensureError || !clientId) {
				toast.error('Failed to set up your account');
				setSaving(false);
				return;
			}
			const { error } = await supabase.from('contacts').insert({
				client_id: clientId,
				first_name: addForm.first_name,
				last_name: addForm.last_name,
				email: addForm.email || null,
				phone: addForm.phone || null,
				status: addForm.status,
				source: addForm.source || null,
				company_id: addForm.company_id,
			});
			if (error) throw error;
			toast.success('Contact added successfully!');
			setShowAdd(false);
			setAddForm({
				first_name: '',
				last_name: '',
				email: '',
				phone: '',
				status: 'Lead',
				source: '',
				company_id: null,
			});
			fetchContacts(true);
		} catch (e: any) {
			toast.error(e.message || 'Failed to add contact');
		} finally {
			setSaving(false);
		}
	};

	const getCompanyName = (companyId: string | null) => {
		if (!companyId) return null;
		return companies.find((c) => c.id === companyId)?.name || null;
	};

	const handleRefresh = () => {
		fetchContacts(true);
		fetchCompanies();
	};

	const [prospectView, setProspectView] = useState<'ready' | 'all' | 'hidden'>('ready');
	// Poor fits (fit under 35) hidden automatically; the owner can bring one back.
	const [hiddenLeads, setHiddenLeads] = useState<ProspectedLead[]>([]);
	const [signalsLead, setSignalsLead] = useState<ProspectedLead | null>(null);
	const readyProspects = prospects.filter((p) => p.company_name && p.contact_email);
	const shownProspects = prospectView === 'ready' && readyProspects.length ? readyProspects : prospects;

	const fetchProspects = useCallback(async () => {
		if (!user?.clientId) return;
		setProspectsLoading(true);
		const { data, error } = await supabase
			.from('prospected_leads' as any)
			.select('*')
			.eq('client_id', user.clientId)
			.is('dismissed_at', null)
			.order('intent_score', { ascending: false })
			.order('prospected_at', { ascending: false })
			.limit(200);
		if (!error && data) setProspects(data as unknown as ProspectedLead[]);
		const { data: hidden } = await supabase
			.from('prospected_leads' as any)
			.select('id, company_name, company_domain, fit_score, fit_reason, trigger_event, source_url, source_type, intent_score, prospected_at')
			.eq('client_id', user.clientId)
			.eq('dismiss_reason', 'poor_fit')
			.not('dismissed_at', 'is', null)
			.order('prospected_at', { ascending: false })
			.limit(200);
		setHiddenLeads((hidden as unknown as ProspectedLead[]) || []);
		setProspectsLoading(false);
	}, [user?.clientId]);

	useEffect(() => {
		if (activeTab === 'prospects') fetchProspects();
	}, [activeTab, fetchProspects]);

	const handleDeleteProspect = async (lead: ProspectedLead) => {
		// Hidden rather than removed, so the daily prospector doesn't find it again.
		setProspects(prev => prev.filter(p => p.id !== lead.id));
		const { error } = await supabase
			.from('prospected_leads' as any)
			.update({ dismissed_at: new Date().toISOString() } as any)
			.eq('id', lead.id);
		if (error) {
			toast.error('Could not delete the lead');
			fetchProspects();
			return;
		}
		toast.success('Lead removed', {
			action: {
				label: 'Undo',
				onClick: async () => {
					await supabase.from('prospected_leads' as any).update({ dismissed_at: null } as any).eq('id', lead.id);
					fetchProspects();
				},
			},
		});
	};

	const restoreLead = async (lead: ProspectedLead) => {
		setHiddenLeads((prev) => prev.filter((p) => p.id !== lead.id));
		// 'kept' so the automatic check doesn't hide it again.
		const { error } = await supabase.from('prospected_leads' as any).update({ dismissed_at: null, dismiss_reason: 'kept' } as any).eq('id', lead.id);
		if (error) toast.error('Could not restore the lead');
		else toast.success(`${lead.company_name || 'Lead'} is back in your list`);
		fetchProspects();
	};

	// Strong leads still missing someone to email: what "Find contacts for top 10" works through.
	const needContact = prospects
		.filter((p) => !p.imported && !p.contact_email && p.company_name && (p.intent_score >= 70 || (p.fit_score ?? 0) >= 60))
		.sort((a, b) => b.intent_score - a.intent_score);

	/** Finds the person to email at each lead (website first, then Hunter) and adds them to contacts. */
	const findContacts = async (ids: string[]) => {
		if (!ids.length) return;
		setFindingIds((prev) => new Set([...prev, ...ids]));
		try {
			const { data, error } = await supabase.functions.invoke('prospect-signals', { body: { action: 'find-contact', lead_ids: ids } });
			if (error || data?.error) throw new Error(data?.error || error?.message);
			const results: any[] = data?.results || [];
			const found = results.filter((r) => r.found);
			if (ids.length === 1) {
				const r = found[0];
				if (r) toast.success(`Added ${r.name || r.email}${r.title ? `, ${r.title}` : ''} to contacts`);
				else toast.error("Couldn't find anyone to email at this company yet");
			} else {
				toast.success(`Found ${found.length} of ${results.length} contacts and added them to your contacts`);
			}
			await fetchProspects();
		} catch (e: any) {
			toast.error(e.message || 'Contact search failed');
		} finally {
			setFindingIds((prev) => { const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next; });
		}
	};

	const handleImportProspect = async (lead: ProspectedLead) => {
		if (!user?.clientId) return;
		setImportingId(lead.id);
		try {
			const nameParts = (lead.contact_name || '').trim().split(' ');
			const firstName = nameParts[0] || lead.company_name || 'Unknown';
			const lastName = nameParts.slice(1).join(' ') || '';

			// Link (or create) the company: contacts reference companies by id.
			let companyId: string | null = null;
			if (lead.company_name || lead.company_domain) {
				let q = supabase.from('companies').select('id').eq('client_id', user.clientId).limit(1);
				q = lead.company_domain ? q.eq('domain', lead.company_domain) : q.ilike('name', lead.company_name!);
				const { data: found } = await q.maybeSingle();
				companyId = (found as any)?.id ?? null;
				// Brands with addresses: the address found on the lead's page goes on the company too.
				const street = [lead.company_address, lead.company_postal_code && !String(lead.company_address || '').includes(lead.company_postal_code) ? lead.company_postal_code : null].filter(Boolean).join(' ');
				const place = BRAND.features.addresses ? { address: street || null, city: lead.company_city || null, state: lead.company_state || null, country: lead.company_country || null } : {};
				if (!companyId) {
					const { data: made } = await supabase.from('companies').insert({
						client_id: user.clientId,
						name: lead.company_name || lead.company_domain!,
						domain: lead.company_domain || null,
						website: lead.company_domain ? `https://${lead.company_domain}` : null,
						...place,
					} as any).select('id').single();
					companyId = (made as any)?.id ?? null;
				} else if (BRAND.features.addresses && lead.company_city) {
					// Fill address fields the existing company doesn't have.
					const { data: cur } = await supabase.from('companies').select('address, city, state, country').eq('id', companyId).maybeSingle();
					const patch = Object.fromEntries(Object.entries(place).filter(([k, v]) => v && !(cur as any)?.[k]));
					if (Object.keys(patch).length) await supabase.from('companies').update(patch as any).eq('id', companyId);
				}
			}

			const { data: contact, error } = await supabase.from('contacts').insert({
				client_id: user.clientId,
				first_name: firstName,
				last_name: lastName,
				email: lead.contact_email || null,
				company_id: companyId,
				title: lead.contact_title || null,
				status: 'Lead',
				source: `Prospector (${lead.source_type})`,
				tags: [lead.trigger_event].filter(Boolean),
			} as any).select('id').single();
			if (error) throw error;

			await supabase
				.from('prospected_leads' as any)
				.update({ imported: true, contact_id: (contact as any)?.id ?? null, company_id: companyId } as any)
				.eq('id', lead.id);

			setProspects(prev => prev.map(p => p.id === lead.id ? { ...p, imported: true } : p));
			toast.success(`${firstName} ${lastName} added to contacts`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to import');
		} finally {
			setImportingId(null);
		}
	};

	return (
		<div className="space-y-4">
			<div className="page-header">
				<div className="flex items-center gap-3">
					<h1 className="page-title">Contacts</h1>
					<span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
						{totalCount} contacts
					</span>
				</div>
				<div className="flex gap-2">
					{activeTab === 'contacts' && (
						<>
							<Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
								<Upload className="w-4 h-4 mr-1" /> Import
							</Button>
							<Button size="sm" onClick={() => setShowAdd(true)}>
								<Plus className="w-4 h-4 mr-1" /> Add Contact
							</Button>
						</>
					)}
					{activeTab === 'prospects' && BRAND.features.prospector && (
						<Button variant="outline" size="sm" onClick={fetchProspects} disabled={prospectsLoading}>
							{prospectsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
							Refresh
						</Button>
					)}
				</div>
			</div>

			{/* Tab switcher */}
			<div className="flex gap-1 border-b">
				{(BRAND.features.prospector ? (['contacts', 'prospects'] as const) : (['contacts'] as const)).map(tab => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={cn(
							'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
							activeTab === tab
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground',
						)}
					>
						{tab === 'prospects' ? (
							<span className="flex items-center gap-1.5">
								<Zap className="w-3.5 h-3.5" /> Prospected Leads
							</span>
						) : tab}
					</button>
				))}
			</div>

			{/* ── Prospects Tab ─────────────────────────────────────────────── */}
			{activeTab === 'prospects' && BRAND.features.prospector && (
				<div className="stat-card overflow-hidden p-0">
					{prospectsLoading ? (
						<div className="p-12 text-center">
							<Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
						</div>
					) : prospects.length === 0 ? (
						<div className="p-12 text-center text-muted-foreground">
							<Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
							<p className="font-medium">No prospects yet</p>
							<p className="text-xs mt-1">Enable the Lead Prospector agent and run it to find hot leads.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							{user?.clientId && <ProspectScorecard clientId={user.clientId} />}
							<div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b">
								{([['ready', `Ready to contact (${readyProspects.length})`], ['all', `All signals (${prospects.length})`]] as const).map(([k, label]) => (
									<button key={k} onClick={() => setProspectView(k)}
										className={cn('px-3 py-1 text-xs rounded-full font-medium', prospectView !== 'hidden' && ((prospectView === k && (k === 'all' || readyProspects.length)) || (k === 'all' && !readyProspects.length)) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}>
										{label}
									</button>
								))}
								{hiddenLeads.length > 0 && (
									<button onClick={() => setProspectView('hidden')} title="Companies that don't match who you sell to, hidden automatically"
										className={cn('px-3 py-1 text-xs rounded-full font-medium', prospectView === 'hidden' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}>
										Hidden: poor fit ({hiddenLeads.length})
									</button>
								)}
								<span className="text-[11px] text-muted-foreground">Ready = a named company and an email to reach them.</span>
								{needContact.length > 0 && (
									<Button size="sm" variant="outline" className="h-7 text-xs ml-auto" disabled={findingIds.size > 0}
										onClick={() => findContacts(needContact.slice(0, 10).map((p) => p.id))}
										title="Leads scoring 70+, or a strong fit (60+), with no one to email yet">
										{findingIds.size > 1 ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserSearch className="w-3 h-3 mr-1" />}
										Find contacts for top {Math.min(10, needContact.length)}
									</Button>
								)}
							</div>
							{prospectView === 'hidden' ? (
								<div className="divide-y">
									<p className="px-3 py-2 text-[11px] text-muted-foreground">
										These companies scored under 35 for fit (wrong kind of company, too big, or outside your area), so they were hidden. Restore any that are worth a look.
									</p>
									{hiddenLeads.map((lead) => (
										<div key={lead.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5">
											<div className="min-w-0 flex-1">
												<div className="text-sm font-medium text-foreground">{lead.company_name || lead.company_domain || 'Unknown company'}</div>
												<div className="text-[11px] text-muted-foreground break-words">
													Fit {lead.fit_score ?? '?'}{lead.fit_reason ? `: ${lead.fit_reason}` : ''}
												</div>
											</div>
											<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => restoreLead(lead)}>Restore</Button>
										</div>
									))}
								</div>
							) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50">
										<th className="text-left p-3 font-medium text-muted-foreground">Company</th>
										<th className="text-left p-3 font-medium text-muted-foreground">Contact</th>
										<th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Signals</th>
										<th className="text-left p-3 font-medium text-muted-foreground">Score</th>
										<th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Type</th>
										<th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Snippet</th>
										<th className="text-left p-3 font-medium text-muted-foreground">Action</th>
									</tr>
								</thead>
								<tbody>
									{shownProspects.map((lead, i) => (
										<motion.tr
											key={lead.id}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: i * 0.02 }}
											className={cn('border-b transition-colors', lead.imported ? 'opacity-50' : 'hover:bg-muted/30')}
										>
											<td className="p-3">
												<div className="font-medium text-foreground">{lead.company_name || '—'}</div>
												{lead.company_domain && (
													<a href={`https://${lead.company_domain}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:underline">{lead.company_domain}</a>
												)}
												{BRAND.features.addresses && leadPlace(lead) && (
													<div className="text-[11px] text-muted-foreground max-w-[220px]">{leadPlace(lead)}</div>
												)}
											</td>
											<td className="p-3">
												<div className="text-foreground">{lead.contact_name || '—'}</div>
												{lead.contact_title && <div className="text-[11px] text-muted-foreground">{lead.contact_title}</div>}
												{lead.contact_email && (
													<div className="text-[11px] text-primary">
														{lead.contact_email}
														{lead.email_verified && <span className="ml-1 text-success" title="Verified mailbox">✓</span>}
														{!lead.email_verified && (lead.email_check === 'catch_all' || lead.email_check === 'unknown') && (
															<span className="ml-1 text-warning" title="Their mail server accepts every address, so this one can't be confirmed. Outreach skips it unless you allow unconfirmed addresses.">(unconfirmed)</span>
														)}
														{lead.email_source === 'website' && <span className="ml-1 text-muted-foreground" title="Published on their website">(site)</span>}
													</div>
												)}
											</td>
											<td className="p-3 text-muted-foreground hidden md:table-cell max-w-[260px]">
												<SignalChips breakdown={lead.score_breakdown} fallback={lead.trigger_event} />
												{lead.talking_point && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{lead.talking_point}</p>}
											</td>
											<td className="p-3">
												<button type="button" onClick={() => setSignalsLead(lead)} title="Why this score"
													className={cn(
													'px-2 py-0.5 rounded-full text-xs font-bold hover:ring-2 hover:ring-primary/30',
													lead.intent_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
													lead.intent_score >= 50 ? 'bg-amber-100 text-amber-700' :
													'bg-muted text-muted-foreground'
												)}>
													{lead.intent_score}
												</button>
												{(lead.signal_count ?? 0) > 1 && <div className="text-[10px] text-muted-foreground mt-0.5">{lead.signal_count} signals</div>}
											</td>
											<td className="p-3 hidden lg:table-cell">
												<span className={cn('px-2 py-0.5 rounded text-[10px] font-medium capitalize', sourceTypeColors[lead.source_type] || sourceTypeColors.other)}>
													{lead.source_type.replace('_', ' ')}
												</span>
											</td>
											<td className="p-3 hidden xl:table-cell max-w-[220px]">
												<p className="text-[11px] text-muted-foreground line-clamp-2">{lead.snippet}</p>
											</td>
											<td className="p-3">
												<div className="flex items-center gap-1.5">
													{lead.imported ? (
														<span className="text-xs text-muted-foreground">Imported</span>
													) : !lead.contact_email ? (
														<Button size="sm" variant="outline" className="h-7 text-xs px-2"
															disabled={findingIds.has(lead.id)} onClick={() => findContacts([lead.id])}
															title="Find the person to email and add them to contacts">
															{findingIds.has(lead.id)
																? <Loader2 className="w-3 h-3 animate-spin" />
																: <><UserSearch className="w-3 h-3 mr-1" />Find contact</>}
														</Button>
													) : (
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-xs px-2"
															disabled={importingId === lead.id}
															onClick={() => handleImportProspect(lead)}
														>
															{importingId === lead.id
																? <Loader2 className="w-3 h-3 animate-spin" />
																: <><UserPlus className="w-3 h-3 mr-1" />Import</>
															}
														</Button>
													)}
													{sourceHref(lead.source_url) && (
														<Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
															<a href={sourceHref(lead.source_url)!} target="_blank" rel="noopener noreferrer" title="Open source">
																<ExternalLink className="w-3 h-3" />
															</a>
														</Button>
													)}
													<Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
														onClick={() => handleDeleteProspect(lead)} title="Delete lead" aria-label="Delete lead">
														<Trash2 className="w-3 h-3" />
													</Button>
												</div>
											</td>
										</motion.tr>
									))}
								</tbody>
							</table>
							)}
						</div>
					)}
				</div>
			)}

			{/* ── Contacts Tab ──────────────────────────────────────────────── */}
			{activeTab === 'contacts' && <div className="space-y-4">
			<div className="flex gap-2 items-center">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search contacts..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowFilters(!showFilters)}
				>
					<Filter className="w-4 h-4 mr-1" />
					Filter
				</Button>
			</div>

			{showFilters && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					className="flex gap-2 flex-wrap"
				>
					{statusFilters.map((s) => (
						<button
							key={s}
							onClick={() => setStatusFilter(s)}
							className={cn(
								'px-3 py-1.5 text-xs rounded-full font-medium transition-colors',
								statusFilter === s
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-accent',
							)}
						>
							{s}
						</button>
					))}
				</motion.div>
			)}

			<div className="stat-card overflow-hidden p-0">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="text-left p-3 font-medium text-muted-foreground">
									Name
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground">
									Phone
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
									Email
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground">
									Status
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
									Score
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
									Company
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
									Source
								</th>
								<th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">
									Tags
								</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={8} className="p-8 text-center">
										<Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
									</td>
								</tr>
							) : contacts.length === 0 ? (
								<tr>
									<td colSpan={8} className="p-8 text-center text-muted-foreground">
										No contacts found
									</td>
								</tr>
							) : (
								contacts.map((c, i) => (
									<motion.tr
										key={c.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: i < PAGE_SIZE ? i * 0.03 : 0 }}
										className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
										onClick={() => setSelectedContact(c)}
									>
										<td className="p-3">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
													{c.first_name[0]}
													{c.last_name[0]}
												</div>
												<span className="font-medium text-foreground">
													{c.first_name} {c.last_name}
												</span>
											</div>
										</td>
										<td className="p-3 text-muted-foreground">{c.phone}</td>
										<td className="p-3 text-muted-foreground hidden md:table-cell">
											{c.email}
										</td>
										<td className="p-3">
											<span
												className={cn(
													'px-2 py-0.5 rounded-full text-xs font-medium',
													statusColors[c.status || 'Lead'],
												)}
											>
												{c.status}
											</span>
										</td>
										<td className="p-3 text-foreground font-medium hidden lg:table-cell">
											{c.lead_score}
										</td>
										<td className="p-3 text-muted-foreground hidden lg:table-cell">
											{getCompanyName(c.company_id) || '—'}
										</td>
										<td className="p-3 text-muted-foreground hidden lg:table-cell">
											{c.source}
										</td>
										<td className="p-3 hidden xl:table-cell">
											<div className="flex gap-1">
												{(c.tags || []).map((t) => (
													<span
														key={t}
														className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]"
													>
														{t}
													</span>
												))}
											</div>
										</td>
									</motion.tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{/* Load More */}
				{hasMore && !loading && contacts.length > 0 && (
					<div className="p-3 text-center border-t">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => fetchContacts(false)}
							disabled={loadingMore}
						>
							{loadingMore ? (
								<Loader2 className="w-4 h-4 animate-spin mr-1" />
							) : null}
							{loadingMore
								? 'Loading...'
								: `Load More (${contacts.length} of ${totalCount})`}
						</Button>
					</div>
				)}
			</div>
			</div>}

			{/* Contact Detail Panel */}
			<ContactDetailPanel
				contact={selectedContact}
				open={!!selectedContact}
				onClose={() => setSelectedContact(null)}
				onSaved={handleRefresh}
				companies={companies}
			/>

			{/* CSV Import Dialog */}
			<ProspectSignalsDialog lead={signalsLead} onClose={() => setSignalsLead(null)} />
			<ContactCsvImportDialog
				open={showImport}
				onOpenChange={setShowImport}
				onImported={handleRefresh}
			/>

			{/* Add Contact Dialog */}
			<Dialog
				open={showAdd}
				onOpenChange={setShowAdd}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Contact</DialogTitle>
						<DialogDescription>
							Create a new contact and optionally link to a company
						</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label className="text-xs">First Name *</Label>
							<Input
								value={addForm.first_name}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, first_name: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Last Name *</Label>
							<Input
								value={addForm.last_name}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, last_name: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Email</Label>
							<Input
								value={addForm.email}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, email: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Phone</Label>
							<Input
								value={addForm.phone}
								onChange={(e) =>
									setAddForm((f) => ({ ...f, phone: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Status</Label>
							<Select
								value={addForm.status}
								onValueChange={(v) => setAddForm((f) => ({ ...f, status: v }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{['Lead', 'Prospect', 'Client', 'Inactive'].map((s) => (
										<SelectItem
											key={s}
											value={s}
										>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Source</Label>
							<Select
								value={addForm.source || 'none'}
								onValueChange={(v) =>
									setAddForm((f) => ({ ...f, source: v === 'none' ? '' : v }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">—</SelectItem>
									{[
										'Website',
										'Referral',
										'Facebook Ad',
										'Google Ad',
										'Walk-in',
										'LinkedIn',
										'Other',
									].map((s) => (
										<SelectItem
											key={s}
											value={s}
										>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label className="text-xs">Company</Label>
						<Select
							value={addForm.company_id || 'none'}
							onValueChange={(v) =>
								setAddForm((f) => ({
									...f,
									company_id: v === 'none' ? null : v,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Link a company..." />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No company</SelectItem>
								{companies.map((c) => (
									<SelectItem
										key={c.id}
										value={c.id}
									>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAdd(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddContact}
							disabled={saving}
						>
							{saving ? 'Saving...' : 'Add Contact'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Contacts;
