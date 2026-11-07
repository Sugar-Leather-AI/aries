import { refreshPlan } from "@/hooks/usePlan";
import { useEffect, useState } from "react";
import { BILLING } from "@/brand/pack";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

interface Plan { id: string; name: string; monthly: number; annual: number; blurb: string }
// The billing function's status. Brands with their own billing screen (src/brand/pack.ts) add fields.
interface Status {
  brand: string; plan: string | null; plan_status: string; plan_interval: string | null;
  trial_ends_at: string | null; current_period_end: string | null; has_subscription: boolean; billing_ready: boolean; exempt: boolean;
  plans?: Plan[]; total?: number | null;
  [key: string]: unknown;
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const day = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "");
const STATUS_TEXT: Record<string, string> = {
  trialing: "Free trial", active: "Active", past_due: "Payment failed", canceled: "Cancelled", unpaid: "Unpaid", incomplete: "Waiting for payment",
};

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

/** Settings > Billing. Aries: its four plans. Other brands bring their own screen (src/brand/pack.ts). */
export default function BillingSettings({ clientId }: { clientId: string }) {
  const [params, setParams] = useSearchParams();
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("billing", { body: { action: "status", client_id: clientId } });
    const message = await fnError(data, error);
    if (message) { toast.error(message); return; }
    setS(data);
  };

  useEffect(() => {
    load();
    if (params.get("checkout") === "success") {
      toast.success("Thanks! Your plan is set up.");
      params.delete("checkout"); setParams(params, { replace: true });
      const t = setTimeout(load, 4000); // the webhook can land a moment after the redirect
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const call = async (action: string, extra: Record<string, unknown>, label: string) => {
    setBusy(label);
    const { data, error } = await supabase.functions.invoke("billing", { body: { action, client_id: clientId, ...extra } });
    const message = await fnError(data, error);
    if (message) { toast.error(message); setBusy(null); return; }
    if (data.url) { window.location.href = data.url; return; }
    toast.success("Plan updated. Any difference is prorated on your next invoice.");
    setBusy(null);
    setTimeout(() => { load(); refreshPlan(); }, 2500);
  };

  if (!s) return <div className="stat-card max-w-3xl py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const trialDays = s.trial_ends_at ? Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400_000) : 0;
  const onTrial = s.plan_status === "trialing" && !s.has_subscription;

  const header = (title: string) => (
    <div className="stat-card space-y-3">
      <h3 className="font-semibold text-foreground">Your plan</h3>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl font-display font-bold text-foreground">{title}</span>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
          s.exempt ? "bg-success/10 text-success" : s.plan_status === "active" ? "bg-success/10 text-success" : s.plan_status === "trialing" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
          {s.exempt ? "Complimentary" : STATUS_TEXT[s.plan_status] || s.plan_status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {s.exempt && "Everything is included on this account, with no limits. "}
        {!s.exempt && onTrial && trialDays > 0 && `${trialDays} day${trialDays === 1 ? "" : "s"} left in your free trial (ends ${day(s.trial_ends_at)}). Every agent is on until then. `}
        {!s.exempt && onTrial && trialDays <= 0 && "Your free trial has ended, so the AI agents are paused. Choose a plan to switch them back on. "}
        {s.has_subscription && s.current_period_end && `Renews ${day(s.current_period_end)}${s.total ? ` at ${dollars(s.total)} a ${s.plan_interval === "year" ? "year" : "month"}` : ""}.`}
        {s.plan_status === "past_due" && " Your last payment didn't go through. Update your card under Manage billing."}
      </p>
      {s.has_subscription && (
        <Button variant="outline" onClick={() => call("portal", {}, "portal")} disabled={busy !== null}>
          {busy === "portal" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-1" />}
          Manage billing (card, invoices, cancel)
        </Button>
      )}
    </div>
  );

  const Own = BILLING[s.brand];
  if (Own) return <Own status={s} header={header} busy={busy} submit={(config) => call(s.has_subscription ? "update" : "checkout", { config }, "submit")} />;
  return <AriesPlans s={s} header={header} busy={busy} onChoose={(plan, interval) => call("checkout", { plan, interval }, plan)} />;
}

// ── Aries ─────────────────────────────────────────────────────────────────────

function AriesPlans({ s, header, busy, onChoose }: { s: Status; header: (t: string) => JSX.Element; busy: string | null; onChoose: (plan: string, interval: "month" | "year") => void }) {
  const [yearly, setYearly] = useState(true);
  const plans = s.plans || [];
  const current = plans.find((p) => p.id === s.plan);
  return (
    <div className="space-y-6 max-w-4xl">
      {header(current ? current.name : s.exempt ? "Everything included" : s.plan_status === "trialing" ? "Free trial" : "No plan yet")}
      {!s.has_subscription && !s.exempt && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">Choose a plan</h3>
            <div className="inline-flex rounded-full border bg-card p-1" role="group" aria-label="Billing period">
              {[["Monthly", false], ["Yearly (save 20%)", true]].map(([label, val]) => (
                <button key={String(label)} type="button" onClick={() => setYearly(val as boolean)}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", yearly === val ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{label as string}</button>
              ))}
            </div>
          </div>
          {!s.billing_ready && <p className="text-sm text-muted-foreground">Online plan payments are being set up. You can keep using your free trial in the meantime.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div key={p.id} className="stat-card flex flex-col gap-3">
                <div><p className="font-display font-bold text-lg text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{p.blurb}</p></div>
                <p><span className="text-3xl font-display font-bold text-foreground tabular-nums">{dollars(yearly ? p.annual : p.monthly)}</span><span className="text-sm text-muted-foreground"> /month</span></p>
                <Button className="mt-auto" onClick={() => onChoose(p.id, yearly ? "year" : "month")} disabled={busy !== null || !s.billing_ready}>
                  {busy === p.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}Choose {p.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
