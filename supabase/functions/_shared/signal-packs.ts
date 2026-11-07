// Signal packs: which buying signals matter for the kind of business a
// Lead Prospector customer runs. A pack sets how much each signal type counts,
// which news searches run, typical job titles to watch for and the tools worth
// flagging on a prospect's website. Customers pick one and can change any
// weight (agents.config.signal_pack and agents.config.signal_weights).
//
// Plain data with no imports: the web app (Prospector settings) imports this
// file too, so both sides always agree.

export type PackSignal =
  | "hiring" | "hiring_cluster" | "long_open_role" | "first_hire"
  | "funding" | "leadership" | "rfp" | "competitor_switch" | "news"
  | "acquisition" | "expansion" | "launch" | "incident" | "tech_stack" | "tech_change";

export type NewsTopic = "funding" | "leadership" | "acquisition" | "expansion" | "launch" | "incident";

export interface SignalPack {
  id: string;
  name: string;
  description: string;
  weights: Partial<Record<PackSignal, number>>;   // one of WEIGHT_LEVELS; missing = Normal (1)
  news: NewsTopic[];                               // news searches to run
  hiring_roles: string[];                          // job titles that suggest a need (added to the AI's)
  leader_titles: string[];                         // new leaders worth watching for in the news
  tools: string[];                                 // tools worth a "Uses X" signal
}

/** Off / Low / Normal / High, as shown in settings. */
export const WEIGHT_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: "Off" }, { value: 0.6, label: "Low" }, { value: 1, label: "Normal" }, { value: 1.4, label: "High" },
];

/** Signal types customers can tune, in display order. */
export const SIGNAL_TYPES: { id: PackSignal; name: string; hint: string }[] = [
  { id: "hiring", name: "Hiring for a role you help with", hint: "A job post for the function you serve" },
  { id: "hiring_cluster", name: "Several openings at once", hint: "Three or more open roles in one team" },
  { id: "long_open_role", name: "Hard-to-fill roles", hint: "A role open 60 days or more" },
  { id: "first_hire", name: "First hire in a function", hint: "\"Our first marketing hire\", no process yet" },
  { id: "funding", name: "New funding", hint: "Funding news and SEC Form D filings" },
  { id: "leadership", name: "New leader", hint: "A new executive, who often reviews vendors" },
  { id: "expansion", name: "New office or location", hint: "Opening, moving or expanding" },
  { id: "acquisition", name: "Acquisition or merger", hint: "Systems and vendors get reviewed" },
  { id: "launch", name: "Product or service launch", hint: "A new offer that needs promoting or supporting" },
  { id: "incident", name: "Security incident", hint: "A breach or outage in the news" },
  { id: "rfp", name: "Request for proposal", hint: "They're asking for proposals" },
  { id: "competitor_switch", name: "Leaving a competitor", hint: "Writing publicly about switching" },
  { id: "tech_stack", name: "Uses a tool you work with", hint: "Spotted on their website" },
  { id: "tech_change", name: "Switched tools", hint: "A tool changed since the last check" },
];

const ALL_NEWS: NewsTopic[] = ["funding", "leadership", "acquisition", "expansion", "launch"];

export const SIGNAL_PACKS: SignalPack[] = [
  {
    id: "balanced", name: "Balanced", description: "Every signal at normal weight. A good start if none of the others fit.",
    weights: {}, news: ALL_NEWS, hiring_roles: [], leader_titles: ["Chief Revenue Officer", "VP of Sales", "VP of Marketing", "Chief Marketing Officer", "Chief Operating Officer"],
    tools: [],
  },
  {
    id: "msp_it", name: "MSPs and IT services",
    description: "Office moves, new locations, tool switches and security incidents; IT hires.",
    weights: { expansion: 1.4, tech_change: 1.4, incident: 1.4, acquisition: 1.4, launch: 0.6 },
    news: ["expansion", "acquisition", "incident", "leadership", "funding"],
    hiring_roles: ["IT Manager", "Systems Administrator", "IT Support Specialist"],
    leader_titles: ["Chief Information Officer", "IT Director", "Chief Technology Officer", "VP of IT", "Chief Operating Officer"],
    tools: [],
  },
  {
    id: "staffing", name: "Staffing and recruiting",
    description: "Clusters of openings, roles that stay open and fast headcount growth.",
    weights: { hiring_cluster: 1.4, long_open_role: 1.4, hiring: 1.4, launch: 0.6, tech_stack: 0.6, tech_change: 0.6 },
    news: ["expansion", "funding", "acquisition"],
    hiring_roles: [], leader_titles: ["Chief People Officer", "VP of Talent", "Head of Talent Acquisition", "VP of People", "Chief Operating Officer"],
    tools: [],
  },
  {
    id: "accounting", name: "Accounting and bookkeeping",
    description: "New funding, new finance leaders and growing companies without a finance team.",
    weights: { funding: 1.4, leadership: 1.4, first_hire: 1.4, launch: 0.6, incident: 0.6 },
    news: ["funding", "leadership", "acquisition", "expansion"],
    hiring_roles: ["Controller", "Staff Accountant", "Bookkeeper"],
    leader_titles: ["Chief Financial Officer", "VP of Finance", "Controller", "Chief Operating Officer"],
    tools: ["QuickBooks", "Stripe"],
  },
  {
    id: "facility_management", name: "Facility management and cleaning",
    description: "New offices, relocations, expansions and new facilities to look after.",
    weights: { expansion: 1.4, acquisition: 1.4, launch: 0.6, tech_stack: 0.6, tech_change: 0.6, incident: 0 },
    news: ["expansion", "acquisition", "funding"],
    hiring_roles: ["Facilities Manager", "Office Manager", "Building Operations Manager"],
    leader_titles: ["Chief Operating Officer", "VP of Operations", "Director of Facilities", "VP of Real Estate"],
    tools: [],
  },
  {
    id: "logistics_3pl", name: "3PL and logistics",
    description: "Growing e-commerce brands, product launches, new storefronts and warehouses.",
    weights: { launch: 1.4, expansion: 1.4, funding: 1.4, tech_stack: 1.4, incident: 0.6 },
    news: ["launch", "expansion", "funding", "acquisition"],
    hiring_roles: ["E-commerce Operations Manager", "Fulfillment Manager", "Supply Chain Coordinator"],
    leader_titles: ["VP of Operations", "Head of E-commerce", "Chief Operating Officer", "VP of Supply Chain"],
    tools: ["Shopify", "Klaviyo", "Gorgias"],
  },
  {
    id: "marketing_agency", name: "Marketing agencies",
    description: "First marketing hires, rebrands, launches and new marketing leaders.",
    weights: { first_hire: 1.4, launch: 1.4, leadership: 1.4, incident: 0 },
    news: ["launch", "leadership", "funding", "expansion"],
    hiring_roles: ["Marketing Manager", "Marketing Coordinator", "Head of Marketing"],
    leader_titles: ["Chief Marketing Officer", "VP of Marketing", "Head of Growth", "Head of Marketing", "Chief Revenue Officer"],
    tools: ["HubSpot", "Mailchimp", "WordPress", "Wix", "Squarespace"],
  },
];

export const packById = (id: string | null | undefined): SignalPack =>
  SIGNAL_PACKS.find((p) => p.id === id) || SIGNAL_PACKS[0];

/** The weight each signal type gets: the pack's, then the customer's changes. */
export function effectiveWeights(config: any): Record<string, number> {
  const pack = packById(config?.signal_pack);
  const out: Record<string, number> = {};
  for (const t of SIGNAL_TYPES) out[t.id] = pack.weights[t.id] ?? 1;
  const own = config?.signal_weights || {};
  for (const [k, v] of Object.entries(own)) if (typeof v === "number" && v >= 0 && v <= 2) out[k] = v;
  return out;
}
