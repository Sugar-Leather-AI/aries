import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus, Eye, Bell, Copy, Loader2, ExternalLink, Settings, AlertTriangle, RefreshCw, CreditCard, Receipt, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Mail, Download } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/payments/CreateInvoiceDialog";
import { downloadInvoicePdf, emailInvoicePdf } from "@/lib/invoicePdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Overdue: "bg-destructive/10 text-destructive",
  Cancelled: "bg-muted text-muted-foreground",
};

const filters = ["All", "Draft", "Sent", "Paid", "Overdue", "Cancelled"];

interface Invoice {
  id: string;
  invoice_number: string;
  contact_name: string | null;
  contact_email: string | null;
  amount: number;
  description: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  square_payment_link_url: string | null;
  square_order_id: string | null;
  stripe_payment_link_url: string | null;
  payment_provider: "square" | "stripe" | null;
  /** Whichever processor's link this invoice has. */
  payment_link_url: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface SquareTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  source_type: string;
  card_brand: string | null;
  last_4: string | null;
  receipt_url: string | null;
  note: string | null;
  provider?: "square" | "stripe";
}

interface SquareStats {
  revenue_this_month: number;
  revenue_last_month: number;
  mom_change: number;
  total_revenue_12m: number;
  total_transactions: number;
  avg_transaction: number;
  total_refunds: number;
  net_revenue: number;
}

const Payments = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  // True when Square or Stripe is connected.
  const [hasSquare, setHasSquare] = useState<boolean | null>(null);
  const [processors, setProcessors] = useState<("square" | "stripe")[]>([]);

  // Square analytics
  const [squareStats, setSquareStats] = useState<SquareStats | null>(null);
  const [squareChart, setSquareChart] = useState<{ month: string; revenue: number }[]>([]);
  const [squareTransactions, setSquareTransactions] = useState<SquareTransaction[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Tab: "invoices" or "transactions"
  const [activeTab, setActiveTab] = useState<"invoices" | "transactions">("invoices");

  const [showNew, setShowNew] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  // View invoice dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user?.clientId) {
      loadInvoices();
      checkSquareConfig();
    }
  }, [user?.clientId]);

  const checkSquareConfig = async () => {
    const { data } = await supabase
      .from("clients")
      .select("square_access_token, stripe_account")
      .eq("id", user!.clientId!)
      .single() as { data: any };
    const providers: ("square" | "stripe")[] = [];
    if (data?.square_access_token) providers.push("square");
    if (data?.stripe_account) providers.push("stripe");
    setProcessors(providers);
    setHasSquare(providers.length > 0);
    if (providers.length) loadSquareAnalytics(providers);
  };

  // Square and Stripe revenue, combined.
  const loadSquareAnalytics = async (providers = processors) => {
    setLoadingAnalytics(true);
    try {
      const results = await Promise.all(providers.map(async (p) => {
        const { data, error } = await supabase.functions.invoke(p === "stripe" ? "stripe-analytics" : "square-analytics", {
          body: { client_id: user!.clientId },
        });
        if (error || data?.error) {
          console.error(`Failed to load ${p} analytics:`, data?.error || error?.message);
          return null;
        }
        return { ...data, recent_transactions: (data.recent_transactions || []).map((t: SquareTransaction) => ({ ...t, provider: p })) };
      }));
      const ok = results.filter(Boolean) as any[];
      if (!ok.length) return;
      const sum = (k: keyof SquareStats) => ok.reduce((s, r) => s + (Number(r.stats?.[k]) || 0), 0);
      const thisMonth = sum("revenue_this_month");
      const lastMonth = sum("revenue_last_month");
      const total = sum("total_revenue_12m");
      const count = sum("total_transactions");
      const refunds = sum("total_refunds");
      setSquareStats({
        revenue_this_month: thisMonth,
        revenue_last_month: lastMonth,
        mom_change: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0,
        total_revenue_12m: total,
        total_transactions: count,
        avg_transaction: count ? Math.round((total / count) * 100) / 100 : 0,
        total_refunds: refunds,
        net_revenue: total - refunds,
      });
      // Both cover the same 12 months, oldest first.
      const base = ok[0].revenue_chart || [];
      setSquareChart(base.map((m: any, i: number) => ({
        month: m.month,
        revenue: ok.reduce((s, r) => s + (Number(r.revenue_chart?.[i]?.revenue) || 0), 0),
      })));
      setSquareTransactions(
        ok.flatMap(r => r.recent_transactions as SquareTransaction[])
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 30),
      );
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, contact_name, contact_email, amount, description, status, due_date, paid_at, square_payment_link_url, square_order_id, stripe_payment_link_url, payment_provider, created_at")
      .eq("client_id", user!.clientId!)
      .order("created_at", { ascending: false }) as { data: any[] | null };
    setInvoices((data || []).map(i => ({ ...i, payment_link_url: i.square_payment_link_url || i.stripe_payment_link_url || null })));
    setLoading(false);
  };

  const filtered = filter === "All" ? invoices : invoices.filter(i => i.status === filter);

  // Invoice stats (for outstanding/overdue — not in Square)
  const invoiceStats = useMemo(() => {
    const outstanding = invoices.filter(i => i.status === "Sent").reduce((s, i) => s + Number(i.amount), 0);
    const outstandingCount = invoices.filter(i => i.status === "Sent").length;
    const overdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + Number(i.amount), 0);
    const overdueCount = invoices.filter(i => i.status === "Overdue").length;
    return { outstanding, outstandingCount, overdue, overdueCount };
  }, [invoices]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied!");
  };

  const sendReminder = async (inv: Invoice) => {
    if (!inv.contact_email) { toast.error("This invoice has no email address"); return; }
    setPdfBusy(`remind:${inv.id}`);
    try {
      const to = await emailInvoicePdf(inv.id, { reminder: true });
      toast.success(`Reminder sent to ${to}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder");
    } finally {
      setPdfBusy(null);
    }
  };

  const downloadPdf = async (inv: Invoice) => {
    setPdfBusy(`pdf:${inv.id}`);
    try { await downloadInvoicePdf(inv.id); }
    catch (err: any) { toast.error(err.message || "Could not build the PDF"); }
    finally { setPdfBusy(null); }
  };

  const emailPdf = async (inv: Invoice) => {
    setPdfBusy(`email:${inv.id}`);
    try {
      const to = await emailInvoicePdf(inv.id);
      toast.success(`Invoice emailed to ${to}`);
    } catch (err: any) {
      toast.error(err.message || "Could not send the invoice");
    } finally {
      setPdfBusy(null);
    }
  };

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Payments</h1>
          {hasSquare && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { loadSquareAnalytics(); loadInvoices(); }} disabled={loadingAnalytics} title="Refresh">
              <RefreshCw className={cn("w-4 h-4", loadingAnalytics && "animate-spin")} />
            </Button>
          )}
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" />New Invoice
        </Button>
      </div>

      {hasSquare === false && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">No card processor connected</p>
            <p className="text-xs text-muted-foreground">You can still send invoices paid by bank transfer (ACH). Connect Square or Stripe in Settings &gt; Payments to add card payment links.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings?tab=Payments"}>
            <Settings className="w-3 h-3 mr-1" />Configure
          </Button>
        </div>
      )}

      {/* Stats from Square */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            title: "Revenue This Month",
            value: squareStats ? fmt(squareStats.revenue_this_month) : "$0",
            change: squareStats && squareStats.mom_change !== 0 ? `${squareStats.mom_change > 0 ? "+" : ""}${squareStats.mom_change}%` : "",
            sub: "vs last month",
            trend: squareStats ? (squareStats.mom_change > 0 ? "up" : squareStats.mom_change < 0 ? "down" : "neutral") : "neutral",
            icon: DollarSign,
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
          },
          {
            title: "Total Revenue (12mo)",
            value: squareStats ? fmt(squareStats.total_revenue_12m) : "$0",
            change: squareStats ? `${squareStats.total_transactions}` : "0",
            sub: "transactions",
            trend: "neutral" as const,
            icon: TrendingUp,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
          },
          {
            title: "Outstanding",
            value: fmt(invoiceStats.outstanding),
            change: `${invoiceStats.outstandingCount}`,
            sub: "invoices pending",
            trend: invoiceStats.outstandingCount > 0 ? "warn" as const : "neutral" as const,
            icon: Receipt,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-500",
          },
          {
            title: "Avg Transaction",
            value: squareStats ? fmt(squareStats.avg_transaction) : "$0",
            change: squareStats && squareStats.total_refunds > 0 ? fmt(squareStats.total_refunds) : "",
            sub: squareStats && squareStats.total_refunds > 0 ? "in refunds" : "per payment",
            trend: "neutral" as const,
            icon: CreditCard,
            iconBg: "bg-ember-500/10",
            iconColor: "text-ember-500",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="stat-card relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1.5">{card.value}</p>
                {(card.change || card.sub) && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {card.trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
                    {card.trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                    {card.change && (
                      <span className={cn("text-xs font-semibold",
                        card.trend === "up" ? "text-emerald-500" :
                        card.trend === "down" ? "text-destructive" :
                        card.trend === "warn" ? "text-amber-500" :
                        "text-muted-foreground"
                      )}>{card.change}</span>
                    )}
                    {card.sub && <span className="text-xs text-muted-foreground">{card.sub}</span>}
                  </div>
                )}
              </div>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", card.iconBg)}>
                <card.icon className={cn("w-5 h-5", card.iconColor)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart from Square */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Revenue (12 Months)</h3>
          {squareStats && (
            <span className="text-xs text-muted-foreground">
              Net: {fmt(squareStats.net_revenue)}
            </span>
          )}
        </div>
        <div className="h-[180px]">
          {loadingAnalytics && squareChart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={squareChart.length > 0 ? squareChart : Array.from({ length: 12 }, (_, i) => ({ month: new Date(0, i).toLocaleString("default", { month: "short" }), revenue: 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1000 ? `$${v / 1000}k` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Tabs: Invoices / Transactions */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("invoices")}
          className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "invoices" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
        >
          <Receipt className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Invoices
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "transactions" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}
        >
          <CreditCard className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Transactions
        </button>
      </div>

      {activeTab === "invoices" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{f}</button>
            ))}
          </div>

          <div className="stat-card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {invoices.length === 0 ? "No invoices yet. Create your first invoice to get started." : "No invoices match this filter."}
                  </td></tr>
                ) : filtered.map((inv, i) => (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{inv.invoice_number}</td>
                    <td className="p-3 text-foreground">
                      <div>{inv.contact_name || "—"}</div>
                      {inv.contact_email && <div className="text-xs text-muted-foreground">{inv.contact_email}</div>}
                    </td>
                    <td className="p-3 font-semibold text-foreground">${Number(inv.amount).toFixed(2)}</td>
                    <td className="p-3"><span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[inv.status] || "")}>{inv.status}</span></td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{inv.due_date || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewInvoice(inv)} title="View details">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadPdf(inv)} disabled={pdfBusy === `pdf:${inv.id}`} title="Download PDF">
                          {pdfBusy === `pdf:${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        </Button>
                        {inv.payment_link_url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(inv.payment_link_url!)} title="Copy payment link">
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        {(inv.status === "Sent" || inv.status === "Overdue") && inv.contact_email && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendReminder(inv)} disabled={pdfBusy === `remind:${inv.id}`} title="Send reminder with the PDF attached">
                            {pdfBusy === `remind:${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "transactions" && (
        <div className="stat-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Payment Method</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Note</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loadingAnalytics ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : squareTransactions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {hasSquare ? "No transactions found yet." : "Connect Square or Stripe to see transactions."}
                </td></tr>
              ) : squareTransactions.map((txn, i) => (
                <motion.tr key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">
                    <div className="text-sm">{new Date(txn.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </td>
                  <td className="p-3 font-semibold text-foreground">${txn.amount.toFixed(2)}</td>
                  <td className="p-3 text-foreground">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{txn.card_brand ? `${txn.card_brand} •••• ${txn.last_4}` : txn.source_type}</span>
                      {processors.length > 1 && txn.provider && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{txn.provider === "stripe" ? "Stripe" : "Square"}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{txn.note || "—"}</td>
                  <td className="p-3 text-right">
                    {txn.receipt_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(txn.receipt_url!, "_blank")} title="View receipt">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateInvoiceDialog open={showNew} onOpenChange={setShowNew} onCreated={() => { loadInvoices(); if (hasSquare) loadSquareAnalytics(); }} />

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={o => { if (!o) setViewInvoice(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>Invoice details</DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Contact</span>
                  <span className="font-medium">{viewInvoice.contact_name || "—"}</span>
                  {viewInvoice.contact_email && <div className="text-xs text-muted-foreground">{viewInvoice.contact_email}</div>}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Amount</span>
                  <span className="font-semibold text-lg">${Number(viewInvoice.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Status</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[viewInvoice.status] || "")}>{viewInvoice.status}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Due Date</span>
                  <span>{viewInvoice.due_date || "—"}</span>
                </div>
                {viewInvoice.paid_at && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Paid At</span>
                    <span>{new Date(viewInvoice.paid_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground block">Created</span>
                  <span>{new Date(viewInvoice.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {viewInvoice.description && (
                <div>
                  <span className="text-xs text-muted-foreground block">Description</span>
                  <span>{viewInvoice.description}</span>
                </div>
              )}
              {viewInvoice.payment_link_url && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Payment Link</span>
                  <div className="flex gap-2">
                    <Input value={viewInvoice.payment_link_url} readOnly className="text-xs font-mono flex-1" />
                    <Button variant="outline" size="icon" onClick={() => copyLink(viewInvoice.payment_link_url!)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => window.open(viewInvoice.payment_link_url!, "_blank")}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => downloadPdf(viewInvoice)} disabled={!!pdfBusy}>
                  {pdfBusy === `pdf:${viewInvoice.id}` ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}Download PDF
                </Button>
                {viewInvoice.contact_email && (viewInvoice.status === "Sent" || viewInvoice.status === "Overdue" ? (
                  <Button variant="outline" onClick={() => sendReminder(viewInvoice)} disabled={!!pdfBusy}>
                    {pdfBusy === `remind:${viewInvoice.id}` ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Bell className="w-4 h-4 mr-1" />}Send Reminder
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => emailPdf(viewInvoice)} disabled={!!pdfBusy}>
                    {pdfBusy === `email:${viewInvoice.id}` ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}Email PDF
                  </Button>
                ))}
                <Button variant="outline" onClick={() => setViewInvoice(null)} className="ml-auto">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
