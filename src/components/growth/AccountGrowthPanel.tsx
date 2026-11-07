import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Loader2, Repeat, RefreshCw, Send, Sparkles, TimerReset, Users, X } from "lucide-react";

interface Move {
  id: string; kind: "stalled_proposal" | "expansion" | "recurring" | "relationship" | "risk";
  title: string; why: string; action: string; value: number; contact_id: string | null;
  email_subject: string; email_body: string; status: "open" | "sent" | "done" | "dismissed"; sent_at?: string;
}
interface Insight { id: string; health_score: number; health_label: string; forecast: number; moves: Move[]; generated_at: string; signals: Record<string, any> }
interface Contact { id: string; first_name: string; last_name: string; email: string | null }

const KIND: Record<Move["kind"], { label: string; icon: typeof Send; tone: string }> = {
  stalled_proposal: { label: "Stalled proposal", icon: TimerReset, tone: "bg-amber-500/10 text-amber-700" },
  expansion: { label: "Expand", icon: ArrowUpRight, tone: "bg-emerald-500/10 text-emerald-700" },
  recurring: { label: "Make it recurring", icon: Repeat, tone: "bg-sky-500/10 text-sky-700" },
  relationship: { label: "Relationship", icon: Users, tone: "bg-violet-500/10 text-violet-700" },
  risk: { label: "Risk", icon: AlertTriangle, tone: "bg-red-500/10 text-red-700" },
};
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

/** Revenue Map: the Account Growth agent's health score, forecast and next best moves for one company. */
export default function AccountGrowthPanel({ clientId, companyId }: { clientId: string; companyId: string }) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string; contact: string }>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ins }, { data: people }] = await Promise.all([
        (supabase.from as any)("account_insights").select("*").eq("company_id", companyId).maybeSingle(),
        supabase.from("contacts").select("id, first_name, last_name, email").eq("company_id", companyId),
      ]);
      setInsight(ins as Insight | null);
      setContacts((people as Contact[]) || []);
      setLoading(false);
    })();
  }, [companyId]);

  const analyze = async (refresh: boolean) => {
    setBusy("analyze");
    const { data, error } = await supabase.functions.invoke("account-growth", { body: { action: "analyze", client_id: clientId, company_id: companyId, refresh } });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    setInsight(data.insight);
  };

  const setStatus = async (m: Move, status: Move["status"]) => {
    if (!insight) return;
    const moves = insight.moves.map((x) => (x.id === m.id ? { ...x, status } : x));
    setInsight({ ...insight, moves });
    await (supabase.from as any)("account_insights").update({ moves }).eq("id", insight.id);
  };

  const edit = (m: Move) => edits[m.id] ?? { subject: m.email_subject, body: m.email_body, contact: m.contact_id || contacts.find((c) => c.email)?.id || "" };
  const setEdit = (m: Move, patch: Partial<{ subject: string; body: string; contact: string }>) => setEdits((e) => ({ ...e, [m.id]: { ...edit(m), ...patch } }));

  const send = async (m: Move) => {
    const e = edit(m);
    setBusy(m.id);
    const { data, error } = await supabase.functions.invoke("account-growth", {
      body: { action: "send", client_id: clientId, company_id: companyId, move_id: m.id, contact_id: e.contact, subject: e.subject, body: e.body },
    });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    toast.success(`Sent to ${data.sent_to}`);
    if (insight) setInsight({ ...insight, moves: insight.moves.map((x) => (x.id === m.id ? { ...x, status: "sent" } : x)) });
  };

  if (loading) return <div className="rounded-xl border p-5 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (!insight) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent/30 p-5 space-y-3">
        <p className="font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Account Growth</p>
        <p className="text-sm text-muted-foreground">Find the best ways to grow this account: stalled proposals to revive, the next service to offer, work that should be a monthly plan, and risks to fix.</p>
        <Button onClick={() => analyze(false)} disabled={busy !== null}>
          {busy === "analyze" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Analyze this account
        </Button>
      </div>
    );
  }

  const live = insight.moves.filter((m) => m.status === "open");
  const doneMoves = insight.moves.filter((m) => m.status !== "open" && m.status !== "dismissed");
  const healthTone = insight.health_label === "Healthy" ? "text-emerald-600 bg-emerald-500/10" : insight.health_label === "Watch" ? "text-amber-600 bg-amber-500/10" : "text-red-600 bg-red-500/10";

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Account Growth</p>
          <p className="text-xs text-muted-foreground">Updated {new Date(insight.generated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", healthTone)}>Health {insight.health_score}/100 · {insight.health_label}</span>
          <span className="text-xs text-muted-foreground">Forecast <strong className="text-foreground">{money(insight.forecast)}</strong> from open deals</span>
          <Button variant="ghost" size="sm" onClick={() => analyze(true)} disabled={busy !== null} title="Analyze again">
            {busy === "analyze" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {live.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open moves. {doneMoves.length ? "Nice work. " : ""}Analyze again after the account changes.</p>
      ) : (
        <div className="space-y-2.5">
          {live.map((m) => {
            const k = KIND[m.kind] || KIND.expansion;
            const e = edit(m);
            const isOpen = open === m.id;
            return (
              <div key={m.id} className="rounded-lg border bg-card">
                <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} className="w-full text-left p-3 flex items-start gap-3">
                  <span className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", k.tone)}><k.icon className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground text-sm">{m.title}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", k.tone)}>{k.label}</span>
                      {m.value > 0 && <span className="text-xs font-semibold text-emerald-600">~{money(m.value)}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.why}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t pt-3">
                    <p className="text-xs"><span className="font-semibold text-foreground">Do:</span> <span className="text-muted-foreground">{m.action}</span></p>
                    <select value={e.contact} onChange={(ev) => setEdit(m, { contact: ev.target.value })} className="w-full h-8 rounded-md border border-input bg-card px-2 text-sm" aria-label="Send to">
                      <option value="">Choose who to email</option>
                      {contacts.map((c) => <option key={c.id} value={c.id} disabled={!c.email}>{`${c.first_name || ""} ${c.last_name || ""}`.trim()}{c.email ? ` (${c.email})` : " (no email)"}</option>)}
                    </select>
                    <Input value={e.subject} onChange={(ev) => setEdit(m, { subject: ev.target.value })} className="h-8 text-sm" aria-label="Subject" />
                    <Textarea value={e.body} onChange={(ev) => setEdit(m, { body: ev.target.value })} rows={7} className="text-sm resize-y" aria-label="Message" />
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setStatus(m, "dismissed")}><X className="w-4 h-4 mr-1" />Not now</Button>
                      <Button variant="outline" size="sm" onClick={() => setStatus(m, "done")}><Check className="w-4 h-4 mr-1" />Done another way</Button>
                      <Button size="sm" onClick={() => send(m)} disabled={busy !== null || !e.contact || !e.subject.trim() || !e.body.trim()}>
                        {busy === m.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Send email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {doneMoves.length > 0 && <p className="text-xs text-muted-foreground">{doneMoves.length} move{doneMoves.length === 1 ? "" : "s"} already handled.</p>}
    </div>
  );
}
