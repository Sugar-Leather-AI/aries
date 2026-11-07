import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Copy, Download, ExternalLink, Landmark, Loader2, Mail, MailCheck, Plus, Receipt, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/deals/AddDealDialog";
import { downloadInvoicePdf, emailInvoicePdf, hasBankDetails, lineTotal, type InvoiceSettings } from "@/lib/invoicePdf";

interface InvoiceContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects (and keeps) this contact, e.g. when opened from a contact or conversation. */
  contactId?: string | null;
  onCreated?: (invoiceId: string) => void;
}

interface ItemRow { description: string; qty: string; unit_price: string }
const emptyItem = (): ItemRow => ({ description: "", qty: "1", unit_price: "" });
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const contactName = (c: InvoiceContact) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Unnamed";

/** The one "New invoice" dialog, used on Payments, contacts and the Inbox. */
export function CreateInvoiceDialog({ open, onOpenChange, contactId, onCreated }: CreateInvoiceDialogProps) {
  const { user } = useAuth();
  const clientId = user?.clientId;

  const [contacts, setContacts] = useState<InvoiceContact[]>([]);
  const [hasSquare, setHasSquare] = useState(false);
  const [hasStripe, setHasStripe] = useState(false);
  const [provider, setProvider] = useState<"square" | "stripe">("square");
  const [hasBank, setHasBank] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [memo, setMemo] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; contact_id: string | null }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [useCardLink, setUseCardLink] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; number: string; link: string | null; emailedTo: string | null } | null>(null);
  const [busy, setBusy] = useState<"pdf" | "email" | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;
    setCreated(null);
    setItems([emptyItem()]); setMemo(""); setProjectId(""); setDueDate("");
    setSelectedContactId(contactId || "");
    setSendEmail(true);
    (async () => {
      const [{ data: people }, { data: client }, { data: projs }] = await Promise.all([
        supabase.from("contacts").select("id, first_name, last_name, email")
          .eq("client_id", clientId).order("first_name").limit(1000),
        supabase.from("clients").select("square_access_token, square_location_id, stripe_account, default_payment_provider, invoice_settings")
          .eq("id", clientId).single() as unknown as Promise<{ data: any }>,
        supabase.from("projects").select("id, name, contact_id").eq("client_id", clientId).order("created_at", { ascending: false }).limit(300),
      ]);
      setProjects((projs as any[]) || []);
      let list = (people as InvoiceContact[]) || [];
      // Make sure a pre-selected contact is present even past the list limit.
      if (contactId && !list.some(c => c.id === contactId)) {
        const { data: one } = await supabase.from("contacts").select("id, first_name, last_name, email").eq("id", contactId).maybeSingle();
        if (one) list = [one as InvoiceContact, ...list];
      }
      setContacts(list);
      const square = !!(client?.square_access_token && client?.square_location_id);
      const stripe = !!client?.stripe_account;
      setHasSquare(square);
      setHasStripe(stripe);
      setProvider(square && stripe ? (client?.default_payment_provider || "square") : stripe ? "stripe" : "square");
      setUseCardLink(square || stripe);
      setHasBank(hasBankDetails((client?.invoice_settings || {}) as InvoiceSettings));
    })();
  }, [open, clientId, contactId]);

  const contact = contacts.find(c => c.id === selectedContactId);
  const parsed = items.map(i => ({ description: i.description.trim(), qty: Number(i.qty) || 0, unit_price: Number(i.unit_price) || 0 }));
  const validItems = parsed.filter(i => i.description && i.qty > 0);
  const total = validItems.reduce((s, i) => s + lineTotal(i), 0);
  const setItem = (idx: number, patch: Partial<ItemRow>) => setItems(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  // The contact's own projects first.
  const projectOptions = [...projects].sort((a, b) => Number(b.contact_id === selectedContactId) - Number(a.contact_id === selectedContactId));
  const canEmail = !!contact?.email;
  const noWayToPay = !useCardLink && !hasBank;
  const hasCard = hasSquare || hasStripe;

  const create = async () => {
    if (!clientId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("square-create-payment-link", {
        body: {
          client_id: clientId,
          contact_id: contact?.id || null,
          contact_name: contact ? contactName(contact) : null,
          contact_email: contact?.email || null,
          amount: total,
          line_items: validItems,
          memo: memo.trim() || null,
          project_id: projectId || null,
          due_date: dueDate || null,
          payment_link: useCardLink,
          provider,
          send_email: false,
        },
      });
      const message = data?.error || (error ? (await (error as any).context?.json?.().catch(() => null))?.error || error.message : null);
      if (message) throw new Error(message);

      let emailedTo: string | null = null;
      if (sendEmail && canEmail) {
        try {
          emailedTo = await emailInvoicePdf(data.invoice_id);
        } catch (e: any) {
          toast.error(`Invoice created, but the email failed: ${e.message}`);
        }
      }
      setCreated({ id: data.invoice_id, number: data.invoice_number, link: data.payment_link_url || null, emailedTo });
      toast.success(emailedTo ? `Invoice emailed to ${emailedTo}` : "Invoice created");
      onCreated?.(data.invoice_id);
    } catch (e: any) {
      toast.error(e.message || "Could not create the invoice");
    } finally {
      setCreating(false);
    }
  };

  const download = async () => {
    if (!created) return;
    setBusy("pdf");
    try { await downloadInvoicePdf(created.id); }
    catch (e: any) { toast.error(e.message || "Could not build the PDF"); }
    finally { setBusy(null); }
  };

  const email = async () => {
    if (!created) return;
    setBusy("email");
    try {
      const to = await emailInvoicePdf(created.id);
      setCreated({ ...created, emailedTo: to });
      toast.success(`Invoice emailed to ${to}`);
    } catch (e: any) { toast.error(e.message || "Could not send the email"); }
    finally { setBusy(null); }
  };

  const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success("Payment link copied"); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg z-[60] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {created ? `Invoice ${created.number}` : "New invoice"}
          </DialogTitle>
          <DialogDescription>
            {created ? "Download the PDF or email it as an attachment." : "Bill a contact by card link, bank transfer (ACH), or both."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-1">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Invoice created</span>
            </div>
            {created.emailedTo && (
              <div className="flex items-center gap-2 text-success/90 bg-success/5 rounded-lg px-3 py-2 text-sm">
                <MailCheck className="w-4 h-4" />Emailed to {created.emailedTo} with the PDF attached
              </div>
            )}
            {created.link && (
              <div>
                <Label className="text-xs text-muted-foreground">Card payment link</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={created.link} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" onClick={() => copy(created.link!)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(created.link!, "_blank")}><ExternalLink className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1" onClick={download} disabled={busy !== null}>
                {busy === "pdf" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}Download PDF
              </Button>
              {canEmail && !created.emailedTo && (
                <Button variant="outline" className="flex-1" onClick={email} disabled={busy !== null}>
                  {busy === "email" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}Email PDF
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contact</Label>
                <div className="mt-1">
                  <SearchSelect
                    value={selectedContactId}
                    onChange={setSelectedContactId}
                    placeholder="Select a contact (optional)"
                    options={contacts.map(c => ({ id: c.id, label: c.email ? `${contactName(c)} (${c.email})` : contactName(c) }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Items *</Label>
                <div className="mt-1 space-y-2">
                  <div className="grid grid-cols-[1fr_56px_84px_28px] gap-2 text-[11px] text-muted-foreground px-0.5">
                    <span>Description</span><span>Qty</span><span>Unit price</span><span />
                  </div>
                  {items.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_56px_84px_28px] gap-2 items-center">
                      <Input value={row.description} onChange={e => setItem(idx, { description: e.target.value })} placeholder="Project completion (hours)" className="h-9" />
                      <Input type="number" min="0" step="any" value={row.qty} onChange={e => setItem(idx, { qty: e.target.value })} className="h-9 px-2" />
                      <Input type="number" min="0" step="0.01" value={row.unit_price} onChange={e => setItem(idx, { unit_price: e.target.value })} placeholder="60.00" className="h-9 px-2" />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-7" disabled={items.length === 1}
                        onClick={() => setItems(rows => rows.filter((_, i) => i !== idx))} title="Remove line">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setItems(rows => [...rows, emptyItem()])}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Add line
                    </Button>
                    <span className="text-sm font-semibold">Total {usd(total)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Due date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-input bg-card px-2 text-sm">
                    <option value="">None</option>
                    {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Memo</Label>
                <Textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} className="mt-1 resize-none" placeholder="Thank you for your business." />
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">How they can pay</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className={`flex items-center gap-2 ${hasCard ? "cursor-pointer" : "opacity-60"}`}>
                    <input type="checkbox" checked={useCardLink} disabled={!hasCard} onChange={e => setUseCardLink(e.target.checked)} className="rounded border-input" />
                    Card, through a {hasSquare && hasStripe ? "" : hasStripe ? "Stripe " : "Square "}payment link
                  </label>
                  {hasSquare && hasStripe && (
                    <select value={provider} onChange={e => setProvider(e.target.value as "square" | "stripe")} disabled={!useCardLink}
                      className="h-7 rounded-md border border-input bg-card px-2 text-xs" aria-label="Payment processor">
                      <option value="square">Square</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  )}
                  {!hasCard && (
                    <span className="text-xs text-muted-foreground">
                      (<Link to="/settings?tab=Payments" className="underline" onClick={() => onOpenChange(false)}>connect Square or Stripe</Link>)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Landmark className="w-4 h-4 text-muted-foreground" />
                  {hasBank
                    ? <span>Bank transfer (ACH), details printed on the PDF</span>
                    : <span className="text-muted-foreground">No bank details yet. <Link to="/settings?tab=Payments" className="underline" onClick={() => onOpenChange(false)}>Add them</Link> to accept ACH.</span>}
                </div>
              </div>

              {canEmail && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded border-input" />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email the PDF invoice to {contact!.email}</span>
                </label>
              )}
              {noWayToPay && (
                <p className="text-xs text-warning">Add bank details or connect Square or Stripe so the invoice says how to pay.</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating || !validItems.length || total < 0.5}>
                {creating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Creating...</> : <><Receipt className="w-4 h-4 mr-1" />{sendEmail && canEmail ? "Create & email" : "Create invoice"}</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
