import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import {
	Upload,
	FileSpreadsheet,
	Loader2,
	CheckCircle2,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactCsvImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImported: () => void;
}

// ---------------------------------------------------------------------------
// Column mapping strategy:
//
// Apollo exports contain ~90 columns with inconsistent naming conventions:
//   - Human-readable: "First Name", "Company Linkedin Url", "# Employees"
//   - Snake_case duplicates: "org_employees", "founded_year", "email_status"
//   - Special chars: "# Employees"
//
// Our approach:
//   1. Normalize headers: lowercase, collapse whitespace, strip outer spaces.
//   2. Map EVERY known Apollo header variant (including the org_ prefixed ones).
//   3. For fields with multiple sources (e.g. phone), use a priority system
//      so the most specific value wins.
// ---------------------------------------------------------------------------

// Contact field mappings — key is the normalized CSV header, value is our DB field
const CONTACT_COLUMN_MAP: Record<string, string> = {
	// Name
	'first name': 'first_name',
	first_name: 'first_name',
	firstname: 'first_name',
	'last name': 'last_name',
	last_name: 'last_name',
	lastname: 'last_name',

	// Email
	email: 'email',
	'email address': 'email',
	email_address: 'email',
	'primary email': 'email',
	primary_email: 'email',

	// Phone — multiple Apollo columns, we pick the best non-empty one at map time
	'mobile phone': 'phone',
	mobile_phone: 'phone',
	'work direct phone': 'phone',
	work_direct_phone: 'phone',
	'home phone': 'phone',
	home_phone: 'phone',
	'corporate phone': 'phone_fallback', // lower priority — see mergeContactPhones()
	corporate_phone: 'phone_fallback',
	'other phone': 'phone_fallback_2',
	other_phone: 'phone_fallback_2',
	phone: 'phone',
	'phone number': 'phone',
	phone_number: 'phone',

	// Title / role
	title: 'title',
	'job title': 'title',
	job_title: 'title',
	contact_headline: 'title',
	headline: 'title',

	// Location
	city: 'city',
	contact_city: 'city',
	state: 'state',
	country: 'country',

	// LinkedIn
	'person linkedin url': 'linkedin_url',
	'linkedin url': 'linkedin_url',
	linkedin_url: 'linkedin_url',

	// Tags / keywords
	keywords: 'tags',
	tags: 'tags',

	// Seniority & department (useful metadata → stored as tags)
	seniority: 'seniority',
	departments: 'departments',

	// Apollo-specific metadata
	'email status': 'email_status',
	email_status: 'email_status',
	stage: 'stage',
	lists: 'lists',
};

// Company field mappings
const COMPANY_COLUMN_MAP: Record<string, string> = {
	// Name
	'company name': 'name',
	company_name: 'name',
	'company name for emails': 'name',
	company: 'name',
	org_name: 'name',

	// Website / domain
	website: 'website',
	'company website': 'website',
	company_website: 'website',
	org_website: 'website',

	// Industry
	industry: 'industry',
	'company industry': 'industry',
	company_industry: 'industry',
	org_industry: 'industry',

	// Location
	'company city': 'city',
	company_city: 'city',
	org_city: 'city',
	'company state': 'state',
	company_state: 'state',
	org_state: 'state',
	orgstate: 'state',
	'company country': 'country',
	company_country: 'country',
	org_country: 'country',
	'company address': 'address',
	company_address: 'address',

	// Social
	'company linkedin url': 'social_linkedin',
	company_linkedin_url: 'social_linkedin',
	org_linkedin: 'social_linkedin',
	'facebook url': 'social_facebook',
	facebook_url: 'social_facebook',
	'company facebook url': 'social_facebook',
	company_facebook_url: 'social_facebook',
	'twitter url': 'social_twitter',
	twitter_url: 'social_twitter',
	'company twitter url': 'social_twitter',
	company_twitter_url: 'social_twitter',

	// Size & revenue
	'# employees': 'employee_count',
	employees: 'employee_count',
	employee_count: 'employee_count',
	'number of employees': 'employee_count',
	org_employees: 'employee_count',
	'annual revenue': 'revenue_range',
	annual_revenue: 'revenue_range',
	revenue_range: 'revenue_range',
	org_revenue: 'revenue_range',

	// Phone
	'company phone': 'phone',
	company_phone: 'phone',

	// Description
	'seo description': 'description',
	'company description': 'description',
	company_description: 'description',

	// Founded
	'founded year': 'founded_year',
	founded_year: 'founded_year',

	// Technologies (useful metadata)
	technologies: 'technologies',
};

function normalizeHeader(h: string): string {
	return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Robust CSV parser — single-pass, handles quoted fields with embedded
// commas, newlines, and double-quote escapes. Works with \n and \r\n.
// ---------------------------------------------------------------------------
function parseCsv(text: string): {
	headers: string[];
	rows: Record<string, string>[];
} {
	const allRows: string[][] = [];
	let currentRow: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];

		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					// Escaped quote
					field += '"';
					i++;
				} else {
					// End of quoted field
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else {
			if (ch === '"') {
				// Start of quoted field
				inQuotes = true;
			} else if (ch === ',') {
				currentRow.push(field.trim());
				field = '';
			} else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
				currentRow.push(field.trim());
				field = '';
				if (currentRow.some((v) => v !== '')) allRows.push(currentRow);
				currentRow = [];
				if (ch === '\r') i++;
			} else if (ch === '\r') {
				// Bare \r (old Mac line endings)
				currentRow.push(field.trim());
				field = '';
				if (currentRow.some((v) => v !== '')) allRows.push(currentRow);
				currentRow = [];
			} else {
				field += ch;
			}
		}
	}
	// Push last field/row
	currentRow.push(field.trim());
	if (currentRow.some((v) => v !== '')) allRows.push(currentRow);

	if (allRows.length < 2) return { headers: [], rows: [] };

	const headers = allRows[0].map(normalizeHeader);

	const rows = allRows.slice(1).map((values) => {
		const row: Record<string, string> = {};
		headers.forEach((h, i) => {
			row[h] = values[i] || '';
		});
		return row;
	});

	return { headers, rows };
}

// ---------------------------------------------------------------------------
// Map a CSV row to our internal fields using the given column map.
// When multiple CSV columns map to the same field, the first non-empty wins.
// ---------------------------------------------------------------------------
function mapRow(
	row: Record<string, string>,
	columnMap: Record<string, string>,
): Record<string, string> {
	const mapped: Record<string, string> = {};
	for (const [csvCol, val] of Object.entries(row)) {
		const field = columnMap[csvCol];
		if (field && val?.trim()) {
			// Only set if not already set (first non-empty value wins)
			if (!mapped[field]) {
				mapped[field] = val.trim();
			}
		}
	}
	return mapped;
}

// ---------------------------------------------------------------------------
// Phone priority resolution for contacts.
// Apollo has 5 phone columns. We prefer: Mobile > Work Direct > Home > Corporate > Other
// The CONTACT_COLUMN_MAP maps the first 3 to "phone" and the rest to fallbacks.
// This function merges them so the best available number is used.
// ---------------------------------------------------------------------------
function resolveContactPhone(mapped: Record<string, string>): string | null {
	return (
		mapped.phone || mapped.phone_fallback || mapped.phone_fallback_2 || null
	);
}

// Clean phone: strip leading apostrophe that Apollo sometimes adds
function cleanPhone(phone: string | null): string | null {
	if (!phone) return null;
	return phone.replace(/^'+/, '').trim() || null;
}

// Parse tags from keywords + seniority + departments
function buildTags(mapped: Record<string, string>): string[] | null {
	const parts: string[] = [];

	// Keywords (comma or semicolon separated)
	if (mapped.tags) {
		parts.push(
			...mapped.tags
				.split(/[,;]/)
				.map((t) => t.trim())
				.filter(Boolean),
		);
	}

	// Add seniority as a tag if present
	if (mapped.seniority) {
		parts.push(`seniority:${mapped.seniority}`);
	}

	// Add departments as tags
	if (mapped.departments) {
		parts.push(
			...mapped.departments
				.split(/[,;]/)
				.map((t) => `dept:${t.trim()}`)
				.filter((t) => t !== 'dept:'),
		);
	}

	// Add Apollo lists as tags
	if (mapped.lists) {
		parts.push(
			...mapped.lists
				.split(/[,;]/)
				.map((t) => `list:${t.trim()}`)
				.filter((t) => t !== 'list:'),
		);
	}

	// Deduplicate
	const unique = [...new Set(parts)];
	return unique.length > 0 ? unique : null;
}

// Format revenue: Apollo sends raw numbers like "6000000", format to readable range
function formatRevenue(val: string | null): string | null {
	if (!val) return null;
	const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
	if (isNaN(num)) return val; // already a string range, pass through
	if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
	if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
	if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
	return `$${num}`;
}

export default function ContactCsvImportDialog({
	open,
	onOpenChange,
	onImported,
}: ContactCsvImportDialogProps) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [parsed, setParsed] = useState<{
		headers: string[];
		rows: Record<string, string>[];
	} | null>(null);
	const [importing, setImporting] = useState(false);
	const [progress, setProgress] = useState('');
	const [result, setResult] = useState<{
		contacts: number;
		companies: number;
		failed: number;
		skipped: number;
	} | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const reset = () => {
		setFile(null);
		setParsed(null);
		setResult(null);
		setProgress('');
	};

	const handleFile = (f: File) => {
		if (!f.name.toLowerCase().endsWith('.csv')) {
			toast.error('Please upload a CSV file');
			return;
		}
		setFile(f);
		setResult(null);
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			const data = parseCsv(text);
			if (data.rows.length === 0) {
				toast.error('No valid rows found in CSV');
				return;
			}
			setParsed(data);
		};
		reader.readAsText(f);
	};

	// Check which headers map to contact or company fields
	const getMappedFields = () => {
		if (!parsed) return { contactFields: [], companyFields: [], unmapped: [] };
		const contactFields: string[] = [];
		const companyFields: string[] = [];
		const unmapped: string[] = [];
		for (const h of parsed.headers) {
			if (CONTACT_COLUMN_MAP[h]) contactFields.push(h);
			else if (COMPANY_COLUMN_MAP[h]) companyFields.push(h);
			else unmapped.push(h);
		}
		return { contactFields, companyFields, unmapped };
	};

	const hasNameColumns = () => {
		if (!parsed) return false;
		const headers = parsed.headers;
		return (
			headers.some((h) => CONTACT_COLUMN_MAP[h] === 'first_name') &&
			headers.some((h) => CONTACT_COLUMN_MAP[h] === 'last_name')
		);
	};

	const handleImport = async () => {
		if (!parsed || parsed.rows.length === 0) return;
		setImporting(true);
		try {
			const { data: clientId, error: ensureError } = await supabase.rpc(
				'ensure_user_client_id',
			);
			if (ensureError || !clientId) {
				toast.error('Failed to set up your account');
				setImporting(false);
				return;
			}

			let contactsCreated = 0;
			let companiesCreated = 0;
			let failed = 0;

			// ---------------------------------------------------------------
			// 1. Extract unique companies and create them first
			// ---------------------------------------------------------------
			const companyNames = new Map<string, Record<string, string>>();
			for (const row of parsed.rows) {
				const companyData = mapRow(row, COMPANY_COLUMN_MAP);
				if (companyData.name) {
					const key = companyData.name.toLowerCase();
					if (!companyNames.has(key)) {
						companyNames.set(key, companyData);
					} else {
						// Merge: fill in any missing fields from subsequent rows
						const existing = companyNames.get(key)!;
						for (const [field, val] of Object.entries(companyData)) {
							if (val && !existing[field]) {
								existing[field] = val;
							}
						}
					}
				}
			}

			const companyIdMap = new Map<string, string>();

			// Fetch existing companies to avoid duplicates
			const { data: existingCompanies } = await supabase
				.from('companies')
				.select('id, name')
				.eq('client_id', clientId);
			if (existingCompanies) {
				for (const c of existingCompanies) {
					companyIdMap.set(c.name.toLowerCase(), c.id);
				}
			}

			if (companyNames.size > 0) {
				const newCompanies = Array.from(companyNames.values()).filter(
					(c) => !companyIdMap.has(c.name.toLowerCase()),
				);

				if (newCompanies.length > 0) {
					setProgress(`Creating ${newCompanies.length} companies...`);
					const batchSize = 50;

					for (let i = 0; i < newCompanies.length; i += batchSize) {
						const batch = newCompanies.slice(i, i + batchSize).map((c) => {
							let website = (c.website || '').trim();
							if (website && !website.startsWith('http'))
								website = `https://${website}`;
							let domain: string | null = null;
							try {
								domain = website ? new URL(website).hostname : null;
							} catch {}

							return {
								client_id: clientId,
								name: c.name,
								website: website || null,
								domain,
								industry: c.industry || null,
								description: c.description || null,
								phone: cleanPhone(c.phone) || null,
								city: c.city || null,
								state: c.state || null,
								country: c.country || null,
								address: c.address || null,
								employee_count: c.employee_count || null,
								revenue_range: formatRevenue(c.revenue_range) || null,
								founded_year: c.founded_year
									? parseInt(c.founded_year) || null
									: null,
								social_linkedin: c.social_linkedin || null,
								social_facebook: c.social_facebook || null,
								social_twitter: c.social_twitter || null,
							};
						});

						const { data, error } = await supabase
							.from('companies')
							.insert(batch as any)
							.select('id, name');

						if (!error && data) {
							companiesCreated += data.length;
							for (const company of data) {
								companyIdMap.set(company.name.toLowerCase(), company.id);
							}
						}
					}
				}
			}

			// ---------------------------------------------------------------
			// 2. Fetch existing contacts for dedup
			// ---------------------------------------------------------------
			setProgress('Checking for duplicates...');
			const existingEmails = new Set<string>();
			const existingNames = new Set<string>();
			const { data: existingContacts } = await supabase
				.from('contacts')
				.select('email, first_name, last_name')
				.eq('client_id', clientId);
			if (existingContacts) {
				for (const c of existingContacts) {
					if (c.email) existingEmails.add(c.email.toLowerCase());
					existingNames.add(`${c.first_name}|${c.last_name}`.toLowerCase());
				}
			}

			// ---------------------------------------------------------------
			// 3. Create contacts in batches
			// ---------------------------------------------------------------
			let skipped = 0;
			const batchSize = 50;
			const contactRows = parsed.rows
				.map((row) => {
					const contactData = mapRow(row, CONTACT_COLUMN_MAP);
					if (!contactData.first_name || !contactData.last_name) return null;

					// Dedup by email first, then by name
					if (
						contactData.email &&
						existingEmails.has(contactData.email.toLowerCase())
					) {
						skipped++;
						return null;
					}
					if (
						!contactData.email &&
						existingNames.has(
							`${contactData.first_name}|${contactData.last_name}`.toLowerCase(),
						)
					) {
						skipped++;
						return null;
					}

					const companyData = mapRow(row, COMPANY_COLUMN_MAP);
					const companyId = companyData.name
						? companyIdMap.get(companyData.name.toLowerCase()) || null
						: null;

					// Resolve best phone number & clean it
					const phone = cleanPhone(resolveContactPhone(contactData));

					// Build rich tags from keywords + seniority + departments + lists
					const tags = buildTags(contactData);

					// Map Apollo "Stage" to our status if present
					const stageToStatus: Record<string, string> = {
						cold: 'Lead',
						approached: 'Lead',
						replied: 'Contacted',
						interested: 'Qualified',
						'not interested': 'Inactive',
						'do not contact': 'Inactive',
						'bad data': 'Inactive',
						'changed job': 'Inactive',
						open: 'Lead',
					};
					const apolloStage = (contactData.stage || '').toLowerCase();
					const status = stageToStatus[apolloStage] || 'Lead';

					// Intra-batch dedup tracking
					if (contactData.email)
						existingEmails.add(contactData.email.toLowerCase());
					existingNames.add(
						`${contactData.first_name}|${contactData.last_name}`.toLowerCase(),
					);

					return {
						client_id: clientId,
						first_name: contactData.first_name,
						last_name: contactData.last_name,
						email: contactData.email || null,
						phone,
						title: contactData.title || null,
						city: contactData.city || null,
						state: contactData.state || null,
						country: contactData.country || null,
						linkedin_url: contactData.linkedin_url || null,
						status,
						source: 'CSV Import',
						tags,
						company_id: companyId,
					};
				})
				.filter(Boolean);

			setProgress(
				`Importing ${contactRows.length} contacts (${skipped} duplicates skipped)...`,
			);

			for (let i = 0; i < contactRows.length; i += batchSize) {
				setProgress(
					`Importing contacts ${i + 1}–${Math.min(i + batchSize, contactRows.length)} of ${contactRows.length}...`,
				);
				const batch = contactRows.slice(i, i + batchSize);

				if (batch.length === 0) continue;

				const { data, error } = await supabase
					.from('contacts')
					.insert(batch as any)
					.select('id');
				if (error) {
					console.error('Contact batch insert error:', error.message, error.details);
					failed += batch.length;
				} else {
					contactsCreated += data?.length || 0;
					failed += batch.length - (data?.length || 0);
				}
			}

			setResult({
				contacts: contactsCreated,
				companies: companiesCreated,
				failed,
				skipped,
			});
			if (contactsCreated > 0) {
				toast.success(
					`Imported ${contactsCreated} contacts${companiesCreated > 0 ? ` and ${companiesCreated} companies` : ''}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`,
				);
				onImported();
			}
			if (failed > 0) toast.error(`${failed} rows failed to import`);
		} catch (e: any) {
			toast.error(e.message || 'Import failed');
		} finally {
			setImporting(false);
			setProgress('');
		}
	};

	const { contactFields, companyFields } = getMappedFields();

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				onOpenChange(o);
				if (!o) reset();
			}}
		>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileSpreadsheet className="w-5 h-5 text-primary" />
						Import Contacts from CSV
					</DialogTitle>
					<DialogDescription>
						Upload a CSV file with contact data. Required columns:{' '}
						<code className="text-primary font-semibold">First Name</code> and{' '}
						<code className="text-primary font-semibold">Last Name</code>.
						Company data will be auto-detected and imported.
					</DialogDescription>
				</DialogHeader>

				{result ? (
					<div className="py-8 text-center space-y-4">
						<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
							<CheckCircle2 className="w-8 h-8 text-primary" />
						</div>
						<div>
							<h3 className="text-lg font-semibold">Import Complete</h3>
							<p className="text-sm text-muted-foreground mt-1">
								{result.contacts} contacts
								{result.companies > 0
									? ` and ${result.companies} companies`
									: ''}{' '}
								imported
								{result.skipped > 0 && `, ${result.skipped} duplicates skipped`}
								{result.failed > 0 && `, ${result.failed} failed`}
							</p>
						</div>
						<Button
							onClick={() => {
								onOpenChange(false);
								reset();
							}}
						>
							Done
						</Button>
					</div>
				) : !parsed ? (
					<div
						className={cn(
							'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
							dragOver
								? 'border-primary bg-primary/5'
								: 'border-border hover:border-primary/50',
						)}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOver(true);
						}}
						onDragLeave={() => setDragOver(false)}
						onDrop={(e) => {
							e.preventDefault();
							setDragOver(false);
							const f = e.dataTransfer.files[0];
							if (f) handleFile(f);
						}}
						onClick={() => fileRef.current?.click()}
					>
						<input
							ref={fileRef}
							type="file"
							accept=".csv"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handleFile(f);
							}}
						/>
						<Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
						<p className="text-sm font-medium text-foreground">
							Drop CSV file here or click to browse
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Supports Apollo, HubSpot, and other CRM exports
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
							<div className="flex items-center gap-2">
								<FileSpreadsheet className="w-5 h-5 text-primary" />
								<div>
									<p className="text-sm font-medium">{file?.name}</p>
									<p className="text-xs text-muted-foreground">
										{parsed.rows.length} rows found
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={reset}
							>
								<X className="w-4 h-4" />
							</Button>
						</div>

						{/* Mapped columns */}
						{contactFields.length > 0 && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1.5">
									Contact fields detected ({contactFields.length}):
								</p>
								<div className="flex flex-wrap gap-1.5">
									{contactFields.map((h) => (
										<Badge
											key={h}
											className="text-[10px] bg-primary/10 text-primary border-primary/20"
										>
											{h} → {CONTACT_COLUMN_MAP[h]}
										</Badge>
									))}
								</div>
							</div>
						)}
						{companyFields.length > 0 && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1.5">
									Company fields detected ({companyFields.length}):
								</p>
								<div className="flex flex-wrap gap-1.5">
									{companyFields.map((h) => (
										<Badge
											key={h}
											variant="outline"
											className="text-[10px]"
										>
											{h} → {COMPANY_COLUMN_MAP[h]}
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Preview rows */}
						<div className="max-h-40 overflow-auto border rounded-lg">
							<table className="w-full text-xs">
								<thead className="bg-muted/50 sticky top-0">
									<tr>
										{parsed.headers.slice(0, 6).map((h) => (
											<th
												key={h}
												className="px-2 py-1.5 text-left font-medium text-muted-foreground"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{parsed.rows.slice(0, 5).map((row, i) => (
										<tr
											key={i}
											className="border-t"
										>
											{parsed.headers.slice(0, 6).map((h) => (
												<td
													key={h}
													className="px-2 py-1.5 truncate max-w-[120px]"
												>
													{row[h]}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
							{parsed.rows.length > 5 && (
								<p className="text-center text-xs text-muted-foreground py-1.5 border-t">
									...and {parsed.rows.length - 5} more
								</p>
							)}
						</div>

						{!hasNameColumns() && (
							<p className="text-xs text-destructive flex items-center gap-1">
								Missing required "First Name" and "Last Name" columns
							</p>
						)}
					</div>
				)}

				{parsed && !result && (
					<DialogFooter>
						<Button
							variant="outline"
							onClick={reset}
						>
							Cancel
						</Button>
						<Button
							onClick={handleImport}
							disabled={importing || !hasNameColumns()}
							className="gap-2"
						>
							{importing ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Upload className="w-4 h-4" />
							)}
							{importing
								? progress || 'Importing...'
								: `Import ${parsed.rows.length} Contacts`}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
