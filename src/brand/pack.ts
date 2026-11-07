// What a storefront in src/brands/<id>/pack.tsx can bring besides its brand
// data: its own marketing site, app shell, logo, billing screen and pages.
// Anything it leaves out falls back to Aries's. Admin pages from every
// storefront in this copy of the code are shown to super admins.
import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BRAND_ID } from "@/brand";

export interface LogoProps { tone?: "dark" | "light"; className?: string; markClassName?: string }
export interface MarkProps { className?: string; title?: string }

/** A page inside the app. `feature` = only when the brand has it on; `plan` = the plan feature that unlocks it. */
export interface AppPage { path: string; element: ReactNode; feature?: string; plan?: string }
export interface AdminPage { path: string; label: string; icon: LucideIcon; element: ReactNode }

export interface BillingProps {
  /** Billing status from the billing function (shape owned by the brand). */
  status: any;
  header: (title: string) => JSX.Element;
  busy: string | null;
  submit: (config: unknown) => void;
}

export interface BrandPack {
  Landing?: ComponentType;
  Pricing?: ComponentType;
  Privacy?: ComponentType;
  Terms?: ComponentType;
  /** Marketing pages beyond landing, pricing and legal. */
  marketingPaths?: string[];
  MarketingPage?: ComponentType;
  /** App shell (navigation) and home screen. */
  Layout?: ComponentType;
  Home?: ComponentType;
  Logo?: ComponentType<LogoProps>;
  Mark?: ComponentType<MarkProps>;
  /** Settings > Billing for businesses on this brand's plans. */
  Billing?: ComponentType<BillingProps>;
  appPages?: AppPage[];
  adminPages?: AdminPage[];
}

const packs = import.meta.glob<{ default: BrandPack }>("../brands/*/pack.tsx", { eager: true });
const byId: Record<string, BrandPack> = Object.fromEntries(
  Object.entries(packs).map(([file, m]) => [file.split("/").slice(-2, -1)[0], m.default]),
);

/** This build's storefront pieces (empty for Aries). */
export const PACK: BrandPack = byId[BRAND_ID] ?? {};
/** Billing screens by brand id, for any business's brand. */
export const BILLING: Record<string, ComponentType<BillingProps> | undefined> =
  Object.fromEntries(Object.entries(byId).map(([id, p]) => [id, p.Billing]));
/** Super admin pages from every storefront. */
export const ADMIN_PAGES: AdminPage[] = Object.values(byId).flatMap((p) => p.adminPages ?? []);
