import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, Loader2, Save } from "lucide-react";
import type { InvoiceSettings } from "@/lib/invoicePdf";

const FIELDS: { key: keyof InvoiceSettings; label: string; placeholder: string; mono?: boolean }[] = [
  { key: "bank_name", label: "Bank name", placeholder: "Chase" },
  { key: "account_name", label: "Account holder", placeholder: "PixelForge Labs LLC" },
  { key: "routing_number", label: "Routing number (ACH)", placeholder: "9 digits", mono: true },
  { key: "account_number", label: "Account number", placeholder: "Account number", mono: true },
  { key: "account_type", label: "Account type", placeholder: "Business checking" },
  { key: "swift", label: "SWIFT / BIC (international, optional)", placeholder: "CHASUS33", mono: true },
];

/** Settings > Payments: what invoice PDFs print besides the business profile. */
export function InvoiceSettingsForm({ clientId }: { clientId: string }) {
  const [form, setForm] = useState<InvoiceSettings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("invoice_settings").eq("id", clientId).single()
      .then(({ data }) => setForm(((data as any)?.invoice_settings || {}) as InvoiceSettings));
  }, [clientId]);

  const set = (key: keyof InvoiceSettings, value: string) => setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    const routing = (form.routing_number || "").replace(/\D/g, "");
    if (routing && routing.length !== 9) { toast.error("A US routing number has 9 digits"); return; }
    setSaving(true);
    const clean = Object.fromEntries(
      Object.entries({ ...form, routing_number: routing }).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v),
    );
    const { error } = await supabase.from("clients").update({ invoice_settings: clean } as any).eq("id", clientId);
    setSaving(false);
    if (error) toast.error("Could not save invoice details");
    else toast.success("Invoice details saved");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-base">Invoice details</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Printed on your PDF invoices. Add bank details so clients can pay by ACH transfer. Your logo comes from
          Business Profile.
        </p>
      </div>

      <div>
        <Label>Business address</Label>
        <Textarea value={form.address || ""} onChange={e => set("address", e.target.value)} rows={3}
          placeholder={"12409 Birnamwood Court\nBurnsville, MN 55337\nUnited States"} className="mt-1.5 resize-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
              className={`mt-1.5 ${f.mono ? "font-mono text-sm" : ""}`} autoComplete="off" />
          </div>
        ))}
      </div>

      <div>
        <Label>Default memo</Label>
        <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2}
          placeholder="Thank you for your business." className="mt-1.5 resize-none" />
        <p className="text-[10px] text-muted-foreground mt-1">Used when an invoice has no memo of its own.</p>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        {saving ? "Saving..." : "Save invoice details"}
      </Button>
    </div>
  );
}
