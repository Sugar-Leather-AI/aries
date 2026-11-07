import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Eye, EyeOff, Loader2, Unplug } from "lucide-react";

interface StripeAccount {
  account_id: string | null;
  name: string;
  livemode: boolean;
  webhook: boolean;
  connected_at: string;
}

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

/** Settings > Payments: connect a Stripe account with its secret key. The key is stored server-side only. */
export function StripeSettingsForm({ clientId }: { clientId: string }) {
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [hasSquare, setHasSquare] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<"square" | "stripe">("square");
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients")
        .select("stripe_account, default_payment_provider, square_access_token, square_location_id")
        .eq("id", clientId).single() as { data: any };
      setAccount(data?.stripe_account || null);
      setHasSquare(!!(data?.square_access_token && data?.square_location_id));
      setDefaultProvider(data?.default_payment_provider || "square");
    })();
  }, [clientId]);

  const connect = async () => {
    setBusy("connect");
    setWarning(null);
    const { data, error } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "connect", client_id: clientId, secret_key: key.trim() },
    });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    setAccount(data.account);
    setKey("");
    if (data.warning) setWarning(data.warning);
    toast.success(`Connected to ${data.account.name}`);
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Stripe? Existing payment links stay live in Stripe, but new payments won't mark invoices paid here.")) return;
    setBusy("disconnect");
    const { data, error } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "disconnect", client_id: clientId },
    });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    setAccount(null);
    setWarning(null);
    toast.success("Stripe disconnected");
  };

  const saveDefault = async (value: "square" | "stripe") => {
    setDefaultProvider(value);
    const { error } = await supabase.from("clients").update({ default_payment_provider: value } as any).eq("id", clientId);
    if (error) toast.error("Could not save the default");
    else toast.success(`New invoices use ${value === "stripe" ? "Stripe" : "Square"} by default`);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-base">Stripe Payments Integration</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect Stripe to add card payment links to invoices. Invoices are marked paid automatically when the customer pays.
          Copy your secret key from{" "}
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Stripe Dashboard &gt; Developers &gt; API keys <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {account ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            Connected to <span className="font-medium">{account.name}</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${account.livemode ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
              {account.livemode ? "Live" : "Test mode"}
            </span>
          </div>
          {(warning || !account.webhook) && (
            <div className="flex items-start gap-2 text-xs rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <span>{warning || "The payment webhook isn't set up, so invoices won't mark themselves paid. Reconnect with a key that can write webhook endpoints."}</span>
            </div>
          )}
          {hasSquare && (
            <div>
              <Label>Default for new invoices</Label>
              <select value={defaultProvider} onChange={e => saveDefault(e.target.value as "square" | "stripe")}
                className="w-full mt-1.5 h-10 rounded-md border px-3 text-sm bg-card text-foreground">
                <option value="square">Square</option>
                <option value="stripe">Stripe</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">You can still pick the other one on each invoice.</p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Customers can pay with any method you've turned on in Stripe (cards, Apple Pay, ACH bank debit and so on), under{" "}
            <a href="https://dashboard.stripe.com/settings/payment_methods" target="_blank" rel="noopener noreferrer" className="underline">Settings &gt; Payment methods</a>.
          </p>
        </div>
      ) : null}

      <div>
        <Label>{account ? "Replace secret key" : "Secret key"}</Label>
        <div className="relative mt-1.5">
          <Input
            type={show ? "text" : "password"}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk_live_... or sk_test_..."
            className="font-mono text-sm pr-10"
            autoComplete="off"
          />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Stored securely on the server and never shown again. Use a test key (sk_test_) to try it without real charges.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={connect} disabled={busy !== null || !key.trim()}>
          {busy === "connect" ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Connecting...</> : account ? "Reconnect" : "Connect Stripe"}
        </Button>
        {account && (
          <Button variant="outline" onClick={disconnect} disabled={busy !== null}>
            {busy === "disconnect" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Unplug className="w-4 h-4 mr-1" />}Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}
