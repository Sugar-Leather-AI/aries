import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

/** Settings for the SEO Agent (agents.agent_type = 'seo'). The report itself lives on the SEO page. */
export default function SeoAgentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [rowId, setRowId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user?.clientId) return;
    (supabase as any).from("agents").select("id, active").eq("client_id", user.clientId).eq("agent_type", "seo").limit(1).maybeSingle()
      .then(({ data }: { data: any }) => { setRowId(data?.id || null); setActive(!!data?.active); });
  }, [open, user?.clientId]);

  const save = async () => {
    if (!user?.clientId) return;
    setSaving(true);
    const { error } = rowId
      ? await (supabase as any).from("agents").update({ active }).eq("id", rowId)
      : await (supabase as any).from("agents").insert({ client_id: user.clientId, agent_type: "seo", name: "SEO Agent", category: "Marketing", active, config: {} });
    setSaving(false);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    toast.success(active ? "SEO Agent is on" : "SEO Agent is off");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🔎 SEO Agent</DialogTitle>
          <DialogDescription>
            Every Monday it checks how customers find your website on Google (with Google Search Console connected) and scans your pages for
            problems, then gives you a short list of fixes, with exact page titles and descriptions to use.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm font-medium">Weekly report on</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </label>
        <p className="text-xs text-muted-foreground">
          Connect Search Console and run a report any time on the <Link to="/seo" className="underline" onClick={() => onOpenChange(false)}>SEO page</Link>.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
