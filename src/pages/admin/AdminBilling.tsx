import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, CreditCard, ExternalLink, Loader2 } from "lucide-react";

import { BRANDS as ALL_BRANDS } from "@/brand";

type BrandId = string;
interface BrandStatus { connected: boolean; account: { name: string; livemode: boolean } | null }
interface AdminStatus {
  brands: Record<BrandId, BrandStatus>;
  paying: Record<BrandId, number>;
  plans: { id: string; name: string; monthly: number; annual: number }[];
}

// Every storefront in this copy of the code (src/brand).
const BRANDS: { id: BrandId; name: string; note: string }[] =
  ALL_BRANDS.map((b) => ({ id: b.id, name: b.name, note: b.billingNote ?? "" }));

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

/** Super admins: each brand's own Stripe account, which collects that brand's plan payments. */
export default function AdminBilling() {
  const [s, setS] = useState<AdminStatus | null>(null);
  const [keys, setKeys] = useState<Record<BrandId, string>>(() => Object.fromEntries(BRANDS.map((b) => [b.id, ""])));
  const [busy, setBusy] = useState<BrandId | null>(null);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("billing", { body: { action: "admin-status" } });
    const message = await fnError(data, error);
    if (message) { toast.error(message); return; }
    setS(data);
  };
  useEffect(() => { load(); }, []);

  const connect = async (brand: BrandId) => {
    setBusy(brand);
    const { data, error } = await supabase.functions.invoke("billing", { body: { action: "connect", brand, secret_key: keys[brand].trim() } });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    setKeys((k) => ({ ...k, [brand]: "" }));
    toast.success(`${BRANDS.find((b) => b.id === brand)!.name} connected to ${data.account.name}. ${data.prices} prices are ready.`);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each brand collects its plan payments through its own Stripe account, so checkout pages, receipts and card statements show that brand.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {BRANDS.map((b) => {
          const st = s?.brands?.[b.id];
          return (
            <div key={b.id} className="stat-card space-y-4">
              <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /><h3 className="font-semibold text-foreground">{b.name} Stripe account</h3></div>
              <p className="text-xs text-muted-foreground">{b.note}</p>
              {!s ? <Loader2 className="w-5 h-5 animate-spin" /> : st?.connected && st.account ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />Connected to <span className="font-medium">{st.account.name}</span>
                  <span className="ml-auto text-xs font-semibold">{st.account.livemode ? "Live" : "Test mode"} · {s.paying?.[b.id] ?? 0} paying</span>
                </div>
              ) : (
                <p className="text-sm text-warning">Not connected. {b.name} businesses can use their free trial but can't choose a paid plan yet.</p>
              )}
              <div>
                <Label htmlFor={`key-${b.id}`}>{st?.connected ? "Replace secret key" : "Secret key"}</Label>
                <Input id={`key-${b.id}`} type="password" value={keys[b.id]} onChange={(e) => setKeys((k) => ({ ...k, [b.id]: e.target.value }))}
                  placeholder="sk_live_... or sk_test_..." className="mt-1.5 font-mono text-sm" autoComplete="off" />
              </div>
              <Button onClick={() => connect(b.id)} disabled={busy !== null || !keys[b.id].trim()}>
                {busy === b.id && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{st?.connected ? "Reconnect" : "Connect"} {b.name}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="stat-card space-y-2 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Setting up the two Stripe accounts</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>In Stripe, open the account menu (top left) and choose <strong>New account</strong> to create a separate account for each brand under the same login.</li>
          <li>In each account, set the public business name, logo, colours and statement descriptor to that brand (Settings &gt; Business &gt; Public details, and Settings &gt; Branding).</li>
          <li>Turn on the customer portal in each account (Settings &gt; Billing &gt; Customer portal), in test and live mode.</li>
          <li>Copy each account's secret key from <a className="underline" href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">Developers &gt; API keys <ExternalLink className="w-3 h-3 inline" /></a> and connect it above. Connecting creates that brand's prices and webhook.</li>
        </ol>
      </div>

      {s && (
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Prices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Item</th><th>Monthly</th><th>Yearly (per month)</th></tr></thead>
              <tbody>
                {s.plans.map((p) => (
                  <tr key={p.id + p.name} className="border-b last:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="tabular-nums">${(p.monthly / 100).toLocaleString()}</td>
                    <td className="tabular-nums">${(p.annual / 100).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
