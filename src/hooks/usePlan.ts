// Which AI agents this business's plan includes, for menu locks and upgrade
// previews (brands with plans). The backend still enforces this on every agent action.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/brand";

export type PlanFeature = "aria" | "luna" | "prospector" | "content" | "reviews" | "growth" | "seo" | "voice";
interface Plan { gated: boolean; active: boolean; trial: boolean; features: PlanFeature[] }

const cache = new Map<string, { at: number; plan: Promise<Plan | null> }>();
const OPEN: Plan = { gated: false, active: true, trial: false, features: [] };

function fetchPlan(clientId: string): Promise<Plan | null> {
  const hit = cache.get(clientId);
  if (hit && Date.now() - hit.at < 60_000) return hit.plan;
  const plan = supabase.functions.invoke("billing", { body: { action: "features", client_id: clientId } })
    .then(({ data, error }) => (error || data?.error ? null : (data as Plan)))
    .catch(() => null);
  cache.set(clientId, { at: Date.now(), plan });
  return plan;
}

/** Forget the cached plan and tell open screens to look again (after a plan change). */
export const refreshPlan = () => { cache.clear(); window.dispatchEvent(new Event("plan-changed")); };

export function usePlan() {
  const { user } = useAuth();
  const clientId = user?.clientId || "";
  const [plan, setPlan] = useState<Plan | null>(BRAND.features.plans && clientId ? null : OPEN);

  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("plan-changed", bump);
    return () => window.removeEventListener("plan-changed", bump);
  }, []);

  useEffect(() => {
    if (!BRAND.features.plans || !clientId) { setPlan(OPEN); return; }
    let live = true;
    fetchPlan(clientId).then((p) => { if (live) setPlan(p || OPEN); });
    return () => { live = false; };
  }, [clientId, version]);

  const loading = plan === null;
  const p = plan || OPEN;
  return {
    loading,
    trial: p.trial,
    active: p.active,
    /** True when the business can use this agent now (always true when not gated). */
    has: (f: PlanFeature) => !p.gated || (p.active && p.features.includes(f)),
  };
}
