import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, MousePointerClick, Send, Star, X } from "lucide-react";

interface RequestRow {
  id: string;
  contact_name: string | null;
  to_email: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "reviewed" | "skipped" | "failed";
  sent_at: string | null;
  clicked_at: string | null;
  reminder_sent_at: string | null;
  reviewed_at: string | null;
  error: string | null;
  created_at: string;
  projects: { name: string } | null;
}

const STATUS: Record<RequestRow["status"], { label: string; cls: string }> = {
  pending: { label: "Waiting for approval", cls: "bg-warning/10 text-warning" },
  sent: { label: "Sent", cls: "bg-info/10 text-info" },
  reviewed: { label: "Reviewed", cls: "bg-success/10 text-success" },
  skipped: { label: "Skipped", cls: "bg-muted text-muted-foreground" },
  failed: { label: "Failed", cls: "bg-destructive/10 text-destructive" },
};

const shortDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

/** Reputation page: review requests drafted by the Google Review Generator. */
export function ReviewRequestsPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [agentOn, setAgentOn] = useState<boolean | null>(null);
  const [hasPlaceId, setHasPlaceId] = useState(true);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: reqs }, { data: agent }, { data: client }] = await Promise.all([
      (supabase.from as any)("review_requests")
        .select("id, contact_name, to_email, subject, body, status, sent_at, clicked_at, reminder_sent_at, reviewed_at, error, created_at, projects(name)")
        .eq("client_id", clientId)
        .or(`status.eq.pending,created_at.gte.${since}`)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("agents" as any).select("active").eq("client_id", clientId).eq("agent_type", "review_request")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("clients").select("google_place_id").eq("id", clientId).single(),
    ]);
    setRows((reqs as RequestRow[]) || []);
    setAgentOn(!!(agent as any)?.active);
    setHasPlaceId(!!(client as any)?.google_place_id);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const pending = rows.filter(r => r.status === "pending");
  const history = rows.filter(r => r.status !== "pending");
  const sent = history.filter(r => r.sent_at);
  const clicked = sent.filter(r => r.clicked_at).length;
  const reviewed = history.filter(r => r.status === "reviewed").length;

  const edit = (r: RequestRow) => edits[r.id] ?? { subject: r.subject, body: r.body };
  const setEdit = (r: RequestRow, patch: Partial<{ subject: string; body: string }>) =>
    setEdits(e => ({ ...e, [r.id]: { ...edit(r), ...patch } }));

  const approve = async (r: RequestRow) => {
    setBusy(r.id);
    const e = edit(r);
    const { data, error } = await supabase.functions.invoke("review-request", {
      body: { action: "approve", id: r.id, subject: e.subject, body: e.body },
    });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); load(); return; }
    toast.success(`Review request sent to ${data.sent_to}`);
    load();
  };

  const skip = async (r: RequestRow) => {
    setBusy(r.id);
    const { error } = await (supabase.from as any)("review_requests")
      .update({ status: "skipped", updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending");
    setBusy(null);
    if (error) toast.error("Could not skip this request");
    else { toast.success("Skipped, nothing was sent"); load(); }
  };

  return (
    <div className="stat-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4 text-warning" />Google review requests</h3>
          <p className="text-xs text-muted-foreground mt-1">
            When you mark a project completed, the Google Review Generator drafts a request to its contact. Nothing is sent until you approve it.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div><div className="text-lg font-semibold text-foreground">{sent.length}</div><div className="text-[11px] text-muted-foreground">Sent (90 days)</div></div>
          <div><div className="text-lg font-semibold text-foreground">{clicked}</div><div className="text-[11px] text-muted-foreground">Opened link</div></div>
          <div><div className="text-lg font-semibold text-success">{reviewed}</div><div className="text-[11px] text-muted-foreground">Reviewed</div></div>
        </div>
      </div>

      {agentOn === false && (
        <div className="flex items-center gap-2 text-sm rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>The Google Review Generator is off. <Link to="/agents" className="underline">Turn it on</Link> to get drafts when projects are completed.</span>
        </div>
      )}
      {!hasPlaceId && (
        <div className="flex items-center gap-2 text-sm rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>Add your Google Place ID in <Link to="/settings" className="underline">Settings</Link> so requests can link to your review page.</span>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map(r => {
            const e = edit(r);
            return (
              <div key={r.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{r.contact_name || r.to_email}</span>
                  <span className="text-muted-foreground">{r.to_email}</span>
                  {r.projects?.name && <span className="text-xs text-muted-foreground">· {r.projects.name}</span>}
                  <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium", STATUS.pending.cls)}>{STATUS.pending.label}</span>
                </div>
                {r.error && <p className="text-xs text-destructive">Last attempt failed: {r.error}</p>}
                <Input value={e.subject} onChange={ev => setEdit(r, { subject: ev.target.value })} className="h-8 text-sm" aria-label="Subject" />
                <Textarea value={e.body} onChange={ev => setEdit(r, { body: ev.target.value })} rows={6} className="text-sm resize-y" aria-label="Message" />
                <p className="text-[11px] text-muted-foreground">A "Leave a review on Google" button is added below your message.</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => skip(r)} disabled={busy === r.id}>
                    <X className="w-4 h-4 mr-1" />Skip
                  </Button>
                  <Button size="sm" onClick={() => approve(r)} disabled={busy === r.id || !e.subject.trim() || !e.body.trim()}>
                    {busy === r.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Approve & send
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 ? (
        <div className="divide-y border rounded-lg text-sm">
          {history.slice(0, 15).map(r => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="font-medium text-foreground">{r.contact_name || r.to_email}</span>
              {r.projects?.name && <span className="text-xs text-muted-foreground">{r.projects.name}</span>}
              <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                {r.sent_at && <span>Sent {shortDate(r.sent_at)}</span>}
                {r.reminder_sent_at && <span>Reminded {shortDate(r.reminder_sent_at)}</span>}
                {r.clicked_at && <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />Opened</span>}
                {r.status === "reviewed" && <span className="flex items-center gap-1 text-success"><Check className="w-3 h-3" />Reviewed</span>}
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STATUS[r.status].cls)}>{STATUS[r.status].label}</span>
              </span>
            </div>
          ))}
        </div>
      ) : pending.length === 0 && (
        <p className="text-sm text-muted-foreground">No review requests yet.</p>
      )}
    </div>
  );
}
