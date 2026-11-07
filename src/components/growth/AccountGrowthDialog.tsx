import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

/** Settings for the Account Growth agent (agents.agent_type = 'account_growth'). */
export default function AccountGrowthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [rowId, setRowId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user?.clientId) return;
    (supabase.from("agents" as any).select("id, active").eq("client_id", user.clientId).eq("agent_type", "account_growth")
      .order("created_at", { ascending: false }).limit(1).maybeSingle() as unknown as Promise<{ data: any }>)
      .then(({ data }) => { setRowId(data?.id || null); setActive(!!data?.active); });
  }, [open, user?.clientId]);

  const save = async () => {
    if (!user?.clientId) return;
    setSaving(true);
    const { error } = rowId
      ? await supabase.from("agents" as any).update({ active } as any).eq("id", rowId)
      : await supabase.from("agents" as any).insert({ client_id: user.clientId, agent_type: "account_growth", name: "Account Growth Agent", category: "Sales", active, config: {} } as any);
    setSaving(false);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    toast.success(active ? "Account Growth is on" : "Account Growth is off");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🌱 Account Growth</DialogTitle>
          <DialogDescription>
            Every Monday it reads the revenue map of your biggest client companies (up to 15) and lines up the next best moves: proposals to revive,
            the next service to offer, work to turn into a monthly plan, and accounts at risk. Each move comes with an email you can edit and send.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm font-medium">Weekly review on</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </label>
        <p className="text-xs text-muted-foreground">
          You can also analyze any company right away from its <Link to="/companies" className="underline" onClick={() => onOpenChange(false)}>Revenue Map</Link> tab. Nothing is ever sent without you.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
