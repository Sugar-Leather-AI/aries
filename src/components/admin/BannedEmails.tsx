import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban, Loader2, X } from "lucide-react";

interface BannedEmail {
  email: string;
  original_email: string;
  reason: string | null;
  created_at: string;
}

/** Adds an address to the ban list. Used here and when deleting a user. */
export async function banEmail(email: string, reason?: string | null) {
  const { error } = await (supabase.from as any)("banned_emails").insert({
    email: email.trim(), original_email: email.trim(), reason: reason?.trim() || null,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}

/** Admin > Users: addresses that can never sign up again (survives account deletion). */
export function BannedEmails({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<BannedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase.from as any)("banned_emails")
      .select("email, original_email, reason, created_at").order("created_at", { ascending: false });
    setRows((data as BannedEmail[]) || []);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const add = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("Enter a full email address"); return; }
    setSaving(true);
    try {
      await banEmail(email, reason);
      toast.success(`${email.trim()} can no longer sign up`);
      setEmail(""); setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not ban the address");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: BannedEmail) => {
    const { error } = await (supabase.from as any)("banned_emails").delete().eq("email", row.email);
    if (error) toast.error("Could not remove the ban");
    else { toast.success(`${row.original_email} can sign up again`); load(); }
  };

  return (
    <div className="stat-card space-y-4">
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Ban className="w-4 h-4" />Banned emails</h3>
        <p className="text-xs text-muted-foreground mt-1">
          These addresses can't sign up, even after their account is deleted. Gmail variants (dots, +tags) are caught too.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="spammer@example.com" className="sm:max-w-xs"
          onKeyDown={e => e.key === "Enter" && add()} />
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="sm:flex-1"
          onKeyDown={e => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={saving || !email.trim()}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}Ban
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No banned addresses.</p>
      ) : (
        <div className="divide-y border rounded-lg">
          {rows.map(r => (
            <div key={r.email} className="flex items-start gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground break-all">{r.original_email}</div>
                <div className="text-xs text-muted-foreground">
                  {r.reason ? `${r.reason} · ` : ""}Banned {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => remove(r)} title="Remove ban">
                <X className="w-3.5 h-3.5 mr-1" />Unban
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
