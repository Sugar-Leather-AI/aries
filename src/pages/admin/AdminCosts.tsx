import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// What each account costs to run: AI calls, email, SMS, WhatsApp, scraping and search.
// Super admins only (the database functions check the role too).

interface AccountRow {
  client_id: string;
  business_name: string | null;
  owner_email: string | null;
  events: number;
  total_cost_usd: number;
  by_service: Record<string, number>;
  last_event_at: string;
}

interface DailyRow {
  day: string;
  client_id: string;
  service: string;
  feature: string;
  events: number;
  units: number;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
}

const PERIODS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const SERVICE_LABELS: Record<string, string> = {
  google_places: "Google Places",
  zernio: "Social posting (Zernio)",
  anthropic: "Claude",
  gemini: "Gemini",
  apify: "Scraping",
  resend: "Email",
  sendgrid: "Email",
  mailgun: "Email",
  telnyx: "SMS",
  twilio: "WhatsApp",
  serp: "Search",
  news: "News search",
};

const FEATURE_LABELS: Record<string, string> = {
  google_reviews_sync: "Google reviews sync",
  social_accounts: "Connected social accounts",
  social_publish: "Social posts",
  content_image: "Post images",
  aria_agent: "Aria replies",
  aria_agent_triage: "Aria sorting",
  personal_assistant: "Personal Assistant replies",
  personal_assistant_triage: "Personal Assistant sorting",
  email_receptionist: "Receptionist replies",
  upsell_agent: "Upsell agent",
  send_email: "Emails sent",
  send_sms: "SMS sent",
  send_whatsapp: "WhatsApp sent by people",
  whatsapp_aria: "WhatsApp sent by Aria",
  whatsapp_personal_assistant: "WhatsApp sent by Personal Assistant",
  scrape_company: "Company scraping",
  scrape_website: "Website scraping",
  analyze_company: "Company analysis",
  enrich_company: "Company enrichment",
  lead_prospector: "Lead prospecting",
  lead_qualification_agent: "Lead scoring",
  lead_capture_bot: "Website chatbot",
  generate_email: "Email drafts",
  generate_content: "Content",
  regenerate_content: "Content rewrites",
  generate_description: "Descriptions",
  generate_review_response: "Review replies",
  review_request: "Review requests",
};

const serviceLabel = (s: string) => SERVICE_LABELS[s] || s;
const featureLabel = (f: string) => FEATURE_LABELS[f] || f.replace(/_/g, " ");

function periodRange(key: PeriodKey): { from: Date; to: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(startOfToday.getTime() + 86_400_000);
  if (key === "this_month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow };
  if (key === "last_month") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  const days = key === "30d" ? 30 : 90;
  return { from: new Date(startOfToday.getTime() - (days - 1) * 86_400_000), to: tomorrow };
}

/** Dollars, with enough precision for the small amounts per-call costs produce. */
function money(v: number): string {
  if (!v) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 100) return `$${v.toFixed(2)}`;
  return `$${Math.round(v).toLocaleString()}`;
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function shortDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function DailyTooltip({ active, payload }: { active?: boolean; payload?: { payload: { day: string; cost: number; events: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{shortDay(p.day)}</p>
      <p className="text-foreground tabular-nums">{money(p.cost)}</p>
      <p className="text-muted-foreground">{p.events} paid {p.events === 1 ? "call" : "calls"}</p>
    </div>
  );
}

const AdminCosts = () => {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const args = { p_from: range.from.toISOString(), p_to: range.to.toISOString() };
    const [acc, day] = await Promise.all([
      supabase.rpc("admin_costs_by_account" as any, args),
      supabase.rpc("admin_costs_daily" as any, { ...args, p_client_id: clientFilter === "all" ? null : clientFilter }),
    ]);
    if (acc.error || day.error) {
      setError((acc.error || day.error)!.message);
    } else {
      setAccounts(((acc.data as any[]) || []).map((r) => ({ ...r, total_cost_usd: Number(r.total_cost_usd) || 0, events: Number(r.events) || 0 })));
      setDaily(((day.data as any[]) || []).map((r) => ({
        ...r,
        day: String(r.day).slice(0, 10),
        events: Number(r.events) || 0,
        units: Number(r.units) || 0,
        input_tokens: Number(r.input_tokens) || 0,
        output_tokens: Number(r.output_tokens) || 0,
        total_cost_usd: Number(r.total_cost_usd) || 0,
      })));
    }
    setLoading(false);
  }, [range, clientFilter]);

  useEffect(() => { load(); }, [load]);

  // Every day in the period, so quiet days show as zero instead of disappearing.
  const chartData = useMemo(() => {
    const byDay = new Map<string, { cost: number; events: number }>();
    for (const r of daily) {
      const d = byDay.get(r.day) || { cost: 0, events: 0 };
      d.cost += r.total_cost_usd;
      d.events += r.events;
      byDay.set(r.day, d);
    }
    const out: { day: string; label: string; cost: number; events: number }[] = [];
    const last = Math.min(range.to.getTime(), Date.now());
    for (let t = range.from.getTime(); t < last; t += 86_400_000) {
      const day = isoDay(new Date(t));
      const v = byDay.get(day) || { cost: 0, events: 0 };
      out.push({ day, label: shortDay(day), cost: Number(v.cost.toFixed(6)), events: v.events });
    }
    return out;
  }, [daily, range]);

  const byFeature = useMemo(() => {
    const m = new Map<string, { service: string; feature: string; events: number; input: number; output: number; units: number; cost: number }>();
    for (const r of daily) {
      const k = `${r.service}|${r.feature}`;
      const v = m.get(k) || { service: r.service, feature: r.feature, events: 0, input: 0, output: 0, units: 0, cost: 0 };
      v.events += r.events; v.input += r.input_tokens; v.output += r.output_tokens; v.units += r.units; v.cost += r.total_cost_usd;
      m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost);
  }, [daily]);

  const shownAccounts = clientFilter === "all" ? accounts : accounts.filter((a) => a.client_id === clientFilter);
  const total = shownAccounts.reduce((s, a) => s + a.total_cost_usd, 0);
  const calls = shownAccounts.reduce((s, a) => s + a.events, 0);
  const top = accounts[0];
  const topService = byFeature.length
    ? Object.entries(byFeature.reduce<Record<string, number>>((acc, f) => {
      const k = serviceLabel(f.service); acc[k] = (acc[k] || 0) + f.cost; return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0]
    : null;
  const accountName = (a?: AccountRow) => a?.business_name || a?.owner_email || "Unnamed account";

  const exportCsv = () => {
    const names = new Map(accounts.map((a) => [a.client_id, accountName(a)]));
    const header = ["day", "account", "service", "feature", "calls", "units", "input_tokens", "output_tokens", "cost_usd"];
    const rows = daily.map((r) => [
      r.day, names.get(r.client_id) || r.client_id, serviceLabel(r.service), featureLabel(r.feature),
      r.events, r.units, r.input_tokens, r.output_tokens, r.total_cost_usd.toFixed(6),
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aries-costs-${isoDay(range.from)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="page-title">Costs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What each account costs to run: AI, email, SMS, WhatsApp, scraping and search. Only super admins see this page.
        </p>
      </div>

      {/* Filters: one row above everything they affect */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                period === p.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-8 rounded-md border px-2 text-xs bg-card text-foreground max-w-[220px]"
          aria-label="Account"
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.client_id} value={a.client_id}>{accountName(a)}</option>)}
        </select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCsv} disabled={!daily.length}>
          <Download className="w-3.5 h-3.5" />Export CSV
        </Button>
      </div>

      {error ? (
        <div className="stat-card text-sm text-destructive">Could not load costs: {error}</div>
      ) : loading ? (
        <div className="stat-card flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />Loading costs…
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total cost" value={money(total)} sub={PERIODS.find((p) => p.key === period)?.label} />
            <StatTile label="Paid calls" value={calls.toLocaleString()} sub={calls ? `${money(total / calls)} on average` : undefined} />
            <StatTile
              label={clientFilter === "all" ? "Costliest account" : "Account"}
              value={clientFilter === "all" ? (top ? money(top.total_cost_usd) : "$0.00") : money(total)}
              sub={clientFilter === "all" ? (top ? accountName(top) : "No usage yet") : accountName(shownAccounts[0])}
            />
            <StatTile label="Biggest service" value={topService ? topService[0] : "None"} sub={topService ? money(topService[1]) : undefined} />
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Daily cost</h2>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowTable((v) => !v)}>
                {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
                {showTable ? "Chart" : "Table"}
              </Button>
            </div>
            {showTable ? (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground"><tr><th className="text-left py-1.5 font-medium">Day</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Cost</th></tr></thead>
                  <tbody className="divide-y">
                    {chartData.filter((d) => d.events).map((d) => (
                      <tr key={d.day}><td className="py-1.5">{d.label}</td><td className="text-right tabular-nums">{d.events}</td><td className="text-right tabular-nums">{money(d.cost)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => money(v)} />
                    <Tooltip content={<DailyTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
                    <Bar dataKey="cost" fill="#CC6633" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="stat-card">
              <h2 className="text-sm font-semibold text-foreground mb-3">By account</h2>
              {accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No paid usage in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr><th className="text-left py-1.5 font-medium">Account</th><th className="text-left font-medium">Split</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Cost</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {accounts.map((a) => (
                      <tr
                        key={a.client_id}
                        onClick={() => setClientFilter(clientFilter === a.client_id ? "all" : a.client_id)}
                        className={cn("cursor-pointer hover:bg-muted/50", clientFilter === a.client_id && "bg-primary/5")}
                      >
                        <td className="py-2 pr-2">
                          <p className="font-medium text-foreground truncate max-w-[160px]">{accountName(a)}</p>
                          {a.business_name && a.owner_email && <p className="text-muted-foreground truncate max-w-[160px]">{a.owner_email}</p>}
                        </td>
                        <td className="pr-2 text-muted-foreground">
                          {Object.entries(a.by_service || {})
                            .sort((x, y) => Number(y[1]) - Number(x[1]))
                            .slice(0, 3)
                            .map(([s, v]) => `${serviceLabel(s)} ${money(Number(v))}`)
                            .join(" · ")}
                        </td>
                        <td className="text-right tabular-nums">{a.events}</td>
                        <td className="text-right tabular-nums font-medium">{money(a.total_cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="stat-card">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                By feature{clientFilter !== "all" ? ` · ${accountName(shownAccounts[0])}` : ""}
              </h2>
              {byFeature.length === 0 ? (
                <p className="text-xs text-muted-foreground">No paid usage in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr><th className="text-left py-1.5 font-medium">Feature</th><th className="text-left font-medium">Service</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Cost</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {byFeature.map((f) => (
                      <tr key={`${f.service}|${f.feature}`}>
                        <td className="py-2 pr-2 text-foreground">
                          {featureLabel(f.feature)}
                          {f.input + f.output > 0 && (
                            <p className="text-muted-foreground">{(f.input + f.output).toLocaleString()} tokens</p>
                          )}
                        </td>
                        <td className="pr-2 text-muted-foreground">{serviceLabel(f.service)}</td>
                        <td className="text-right tabular-nums">{f.events}</td>
                        <td className="text-right tabular-nums font-medium">{money(f.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Costs are calculated when each call happens, from the vendors' list prices (Claude and Gemini by tokens used,
            email/SMS/WhatsApp per message, scraping and search per run). Shared hosting (the server, database and
            scraping jobs on Google Cloud) is not split per account and isn't included.
          </p>
        </>
      )}
    </div>
  );
};

export default AdminCosts;
