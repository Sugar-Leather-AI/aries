// Which storefront this build is. Aries AI is built in; other storefronts can
// add themselves as a folder in src/brands/<id>/ with a brand.ts (this data)
// and a pack.tsx (their own pages and pieces, see ./pack.ts). VITE_BRAND picks
// one at build time; without it, or without that folder, the build is Aries.

/** Features a storefront offers. Off = hidden from its menus, pages and agent list. */
export interface BrandFeatures {
  /** Sales Outreach agent and the Outreach page. */
  outreach: boolean;
  /** Account Growth agent (revenue map analysis and next best moves). */
  accountGrowth: boolean;
  /** The older Upsell & Cross-Sell agent. */
  upsell: boolean;
  /** SEO Agent (Search Console report, site check and fixes) and the SEO page. */
  seo: boolean;
  /** Aria answers phone calls (Calls page, voice line). */
  voice: boolean;
  /** Lead Prospector agent, the Prospected Leads tab and prospect signals on companies. */
  prospector: boolean;
  /** Plans with per-agent access: pages outside the plan show an upgrade preview. */
  plans: boolean;
  /** Street addresses on companies. */
  addresses: boolean;
  /** Auto-fill and Find contact on a company. */
  companyTools: boolean;
}

/** Wording that differs between storefronts. Missing entries use Aries's. */
export interface BrandCopy {
  governanceTitle: string;
  governanceIntro: string;
  governanceEmpty: string;
}

export interface Brand {
  id: string;
  features: BrandFeatures;
  /** Full name, e.g. in copyright lines and emails. */
  name: string;
  /** Short name used in sentences ("See how Aries fits your business"). */
  short: string;
  tagline: string;
  /** Where "See pricing" goes from inside the app. */
  pricingUrl?: string;
  copy?: Partial<BrandCopy>;
  /** Super admin > Billing: who pays through this brand's payment account. */
  billingNote?: string;
}

export const ARIES: Brand = {
  id: "aries",
  features: {
    outreach: false, accountGrowth: false, upsell: true, seo: false, voice: false, prospector: false,
    plans: false, addresses: false, companyTools: false,
  },
  name: "Aries AI",
  short: "Aries",
  tagline: "From scattered to in control",
  billingNote: "Businesses that signed up on the Aries site pay here.",
};

const ARIES_COPY: BrandCopy = {
  governanceTitle: "AI Governance Intelligence",
  governanceIntro: "ARIA Governance Risk Classification",
  governanceEmpty: "Generate an AGRC intelligence report for this company.",
};

const extra = import.meta.glob<{ default: Brand }>("../brands/*/brand.ts", { eager: true });

/** Every storefront in this copy of the code, Aries first. */
export const BRANDS: Brand[] = [ARIES, ...Object.values(extra).map((m) => m.default)];

export const BRAND: Brand = BRANDS.find((b) => b.id === import.meta.env.VITE_BRAND) ?? ARIES;
export const BRAND_ID = BRAND.id;
export const isAries = BRAND_ID === "aries";
export const COPY: BrandCopy = { ...ARIES_COPY, ...BRAND.copy };
