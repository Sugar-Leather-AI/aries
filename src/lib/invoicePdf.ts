// Builds an invoice PDF in the browser (download or email attachment).
// Logo comes from Settings > Business Profile; address and bank (ACH) details
// from Settings > Payments > Invoice details.
import type { jsPDF as JsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { localDate } from "@/lib/dates";

export interface InvoiceSettings {
  address?: string;
  phone?: string;
  website?: string;
  bank_name?: string;
  account_name?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: string;
  swift?: string;
  notes?: string;
}

export interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

export interface InvoiceDoc {
  id: string;
  number: string;
  amount: number;
  items: LineItem[];
  memo: string | null;
  project: string | null;
  status: string;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  payLink: string | null;
  business: { name: string; owner: string | null; email: string | null; logoUrl: string | null } & InvoiceSettings;
  billTo: { name: string | null; email: string | null; company: string | null };
  contactId: string | null;
  clientId: string;
}

export const hasBankDetails = (s: InvoiceSettings) => !!(s.routing_number && s.account_number);

export const lineTotal = (i: LineItem) => Math.round(Number(i.qty || 0) * Number(i.unit_price || 0) * 100) / 100;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const ordinal = (d: number) => {
  const s = ["th", "st", "nd", "rd"], v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** "September 29th, 2026" */
export const invoiceDate = (value: string | null) => {
  if (!value) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? localDate(value) : new Date(value);
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
};

export const invoiceFileName = (inv: Pick<InvoiceDoc, "number" | "business">) =>
  `${inv.business.name.replace(/[^\w&]+/g, "-").replace(/-+$/, "")}-Invoice-${inv.number}.pdf`;

/** Loads everything the PDF needs for one invoice. */
export async function loadInvoiceDoc(invoiceId: string): Promise<InvoiceDoc> {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, client_id, contact_id, invoice_number, contact_name, contact_email, amount, description, line_items, memo, status, due_date, paid_at, square_payment_link_url, stripe_payment_link_url, created_at, projects(name)")
    .eq("id", invoiceId)
    .single() as { data: any; error: any };
  if (error || !inv) throw new Error("Invoice not found");

  const [{ data: client }, contactRes] = await Promise.all([
    supabase.from("clients").select("business_name, owner_name, email, phone, website, logo_url, invoice_settings").eq("id", inv.client_id).single() as unknown as Promise<{ data: any }>,
    inv.contact_id
      ? supabase.from("contacts").select("first_name, last_name, email, companies(name)").eq("id", inv.contact_id).maybeSingle() as unknown as Promise<{ data: any }>
      : Promise.resolve({ data: null }),
  ]);
  const settings: InvoiceSettings = client?.invoice_settings || {};
  const contact = contactRes.data;
  const items: LineItem[] = Array.isArray(inv.line_items) && inv.line_items.length
    ? inv.line_items.map((i: any) => ({ description: String(i.description || ""), qty: Number(i.qty) || 0, unit_price: Number(i.unit_price) || 0 }))
    : [{ description: inv.description || "Services", qty: 1, unit_price: Number(inv.amount) }];

  return {
    id: inv.id,
    number: inv.invoice_number,
    amount: Number(inv.amount),
    items,
    memo: inv.memo || settings.notes || null,
    project: inv.projects?.name || null,
    status: inv.status,
    issuedAt: inv.created_at,
    dueDate: inv.due_date,
    paidAt: inv.paid_at,
    payLink: inv.square_payment_link_url || inv.stripe_payment_link_url,
    clientId: inv.client_id,
    contactId: inv.contact_id,
    business: {
      ...settings,
      name: client?.business_name || "",
      owner: client?.owner_name || null,
      email: client?.email || null,
      logoUrl: client?.logo_url || null,
      phone: settings.phone || client?.phone || "",
      website: settings.website || client?.website || "",
    },
    billTo: {
      name: inv.contact_name || (contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() : null),
      email: inv.contact_email || contact?.email || null,
      company: contact?.companies?.name || null,
    },
  };
}

/** Logo as a PNG data URL plus its size, or null if it can't be loaded. */
async function loadLogo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

const INK: [number, number, number] = [26, 26, 26];
const RULE: [number, number, number] = [210, 210, 210];
const GREEN: [number, number, number] = [46, 125, 50];
const GREEN_BG: [number, number, number] = [232, 245, 233];
const AMBER: [number, number, number] = [180, 83, 9];
const AMBER_BG: [number, number, number] = [254, 243, 226];

export async function buildInvoicePdf(inv: InvoiceDoc): Promise<JsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46;
  const right = W - M;
  const b = inv.business;
  const paid = inv.status === "Paid";
  const subtotal = inv.items.reduce((s, i) => s + lineTotal(i), 0) || inv.amount;

  const text = (t: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right" | "center" } = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 11);
    doc.setTextColor(...(o.color ?? INK));
    doc.text(t, x, y, { align: o.align ?? "left" });
  };
  const rule = (x1: number, x2: number, y: number, dark = false) => {
    doc.setDrawColor(...(dark ? INK : RULE));
    doc.setLineWidth(dark ? 0.9 : 0.6);
    doc.line(x1, y, x2, y);
  };

  // Title + status badge
  let y = 72;
  text("Invoice", M, y, { size: 22, bold: true });
  const badge = paid ? { label: "PAID", fg: GREEN, bg: GREEN_BG }
    : inv.status === "Overdue" ? { label: "OVERDUE", fg: AMBER, bg: AMBER_BG }
    : null;
  if (badge) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    const bx = M + doc.getTextWidth("Invoice") + 16;
    doc.setFontSize(10);
    const bw = doc.getTextWidth(badge.label) + 26;
    doc.setFillColor(...badge.bg);
    doc.setDrawColor(...badge.fg);
    doc.setLineWidth(0.9);
    doc.roundedRect(bx, y - 19, bw, 24, 4, 4, "FD");
    text(badge.label, bx + bw / 2, y - 3.5, { size: 10, bold: true, color: badge.fg, align: "center" });
  }

  // Logo, top right
  if (b.logoUrl) {
    const logo = await loadLogo(b.logoUrl);
    if (logo) {
      const box = 64;
      const s = Math.min(box / logo.w, box / logo.h);
      const lw = logo.w * s, lh = logo.h * s;
      doc.addImage(logo.data, "PNG", right - lw, 44 + (box - lh) / 2, lw, lh);
    }
  }

  // Invoice details
  y += 28;
  const meta: [string, string][] = [
    ["Invoice number", inv.number],
    ["Date of issue", invoiceDate(inv.issuedAt)],
  ];
  if (inv.dueDate) meta.push(["Date due", invoiceDate(inv.dueDate)]);
  if (paid && inv.paidAt) meta.push(["Date paid", invoiceDate(inv.paidAt)]);
  if (inv.project) meta.push(["Project", inv.project]);
  meta.forEach(([k, v], i) => {
    text(k, M, y, { bold: i === 0 });
    text(v, M + 132, y, { bold: i === 0 });
    y += 17;
  });

  // From / Bill to
  y += 30;
  const col2 = M + (right - M) * 0.46;
  text("From", M, y);
  text("Bill to", col2, y);
  y += 25;
  const fromLines = [
    [b.owner, b.name].filter(Boolean).join(", "),
    b.email || "",
    ...(b.address ? b.address.split("\n").map(l => l.trim()) : []),
    b.phone || "",
  ].filter(Boolean);
  const billLines = [
    [inv.billTo.name, inv.billTo.company].filter(Boolean).join(", "),
    inv.billTo.email || "",
  ].filter(Boolean);
  const rows = Math.max(fromLines.length, billLines.length, 1);
  for (let i = 0; i < rows; i++) {
    if (fromLines[i]) text(fromLines[i], M, y + i * 17);
    if (billLines[i]) text(billLines[i], col2, y + i * 17);
  }
  y += rows * 17 + 50;

  // Headline
  const headline = paid
    ? `${money(inv.amount)} USD paid${inv.paidAt ? ` ${invoiceDate(inv.paidAt)}` : ""}`
    : `${money(inv.amount)} USD due${inv.dueDate ? ` ${invoiceDate(inv.dueDate)}` : ""}`;
  text(headline, M, y, { size: 15, bold: true });
  if (!paid && inv.payLink) {
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(204, 102, 51);
    doc.textWithLink("Pay online by card", M, y, { url: inv.payLink });
  }
  y += 40;

  // Line items
  const cQty = right - 210, cUnit = right - 105;
  text("Description", M, y);
  text("Qty", cQty, y, { align: "right" });
  text("Unit price", cUnit, y, { align: "right" });
  text("Amount", right, y, { align: "right" });
  y += 9;
  rule(M, right, y, true);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const item of inv.items) {
    const lines: string[] = doc.splitTextToSize(item.description || "", cQty - M - 50);
    lines.forEach((l, i) => text(l, M, y + i * 15));
    text(String(item.qty), cQty, y, { align: "right" });
    text(money(item.unit_price), cUnit, y, { align: "right" });
    text(money(lineTotal(item)), right, y, { align: "right" });
    y += Math.max(1, lines.length) * 15 + 9;
  }

  // Totals (right) with bank transfer details beside them (left)
  y += 34;
  const tx = right - 200;
  const totalsTop = y;
  const totals: [string, string, boolean][] = [
    ["Subtotal", money(subtotal), false],
    ["Total", money(inv.amount), false],
  ];
  if (paid) {
    totals.push(["Amount paid", `${money(inv.amount)} USD`, true]);
    totals.push(["Balance due", `${money(0)} USD`, false]);
  } else {
    totals.push(["Amount due", `${money(inv.amount)} USD`, true]);
  }
  totals.forEach(([k, v, bold], i) => {
    text(k, tx, y, { bold });
    text(v, right, y, { bold, align: "right" });
    if (i < totals.length - 1) rule(tx, right, y + 9);
    y += 24;
  });

  const bank = !paid && hasBankDetails(b)
    ? ([
        ["Bank", b.bank_name || ""],
        ["Account name", b.account_name || b.name],
        ["Routing (ACH)", b.routing_number || ""],
        ["Account no.", b.account_number || ""],
        ["Account type", b.account_type || ""],
        ["SWIFT / BIC", b.swift || ""],
        ["Reference", inv.number],
      ] as [string, string][]).filter(([, v]) => v)
    : [];
  if (bank.length) {
    let by = totalsTop;
    text("Pay by bank transfer", M, by, { bold: true });
    by += 20;
    for (const [k, v] of bank) {
      text(k, M, by, { size: 10 });
      doc.setFontSize(10);
      const shown: string = doc.splitTextToSize(v, tx - M - 115)[0] || v;
      text(shown, M + 95, by, { size: 10, bold: k === "Routing (ACH)" || k === "Account no." || k === "Reference" });
      by += 15;
    }
    y = Math.max(y, by);
  }

  // Memo pinned near the bottom, like a footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const memoLines: string[] = inv.memo ? doc.splitTextToSize(inv.memo, right - M) : [];
  if (memoLines.length) {
    const memoH = 46 + memoLines.length * 15;
    let my2 = Math.max(y + 24, H - 50 - memoH);
    if (my2 + memoH > H - 30) { doc.addPage(); my2 = 60; }
    rule(M, right, my2);
    my2 += 26;
    text("Memo", M, my2);
    my2 += 22;
    memoLines.forEach((l, i) => text(l, M, my2 + i * 15));
  }

  return doc;
}

export async function downloadInvoicePdf(invoiceId: string) {
  const inv = await loadInvoiceDoc(invoiceId);
  const doc = await buildInvoicePdf(inv);
  doc.save(invoiceFileName(inv));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function invoiceEmailHtml(inv: InvoiceDoc, reminder: boolean) {
  const hi = inv.billTo.name ? `Hi ${esc(inv.billTo.name.split(" ")[0])},` : "Hi,";
  const lead = reminder
    ? `This is a friendly reminder that invoice <strong>${esc(inv.number)}</strong> for <strong>${money(inv.amount)}</strong> is ${inv.status === "Overdue" ? "overdue" : "awaiting payment"}. A copy is attached.`
    : `Please find invoice <strong>${esc(inv.number)}</strong> for <strong>${money(inv.amount)}</strong> attached${inv.dueDate ? `, due ${esc(invoiceDate(inv.dueDate))}` : ""}.`;
  const bank = hasBankDetails(inv.business)
    ? `<p style="margin:0 0 16px">To pay by bank transfer (ACH), use the bank details on the invoice and include <strong>${esc(inv.number)}</strong> as the reference.</p>`
    : "";
  const button = inv.payLink
    ? `<p style="margin:0 0 20px"><a href="${esc(inv.payLink)}" style="display:inline-block;padding:11px 24px;background:#CC6633;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Pay ${money(inv.amount)} online</a></p>`
    : "";
  const sign = [inv.business.owner, inv.business.name].filter(Boolean).map(s => esc(s!)).join("<br>");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.55;color:#1c1917;max-width:560px">
<p style="margin:0 0 16px">${hi}</p>
<p style="margin:0 0 16px">${lead}</p>
${button}${bank}
<p style="margin:0">Thank you,<br>${sign}</p>
</div>`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Emails the invoice to its contact with the PDF attached. Returns the address used. */
export async function emailInvoicePdf(invoiceId: string, opts: { to?: string; reminder?: boolean } = {}) {
  const inv = await loadInvoiceDoc(invoiceId);
  const to = opts.to || inv.billTo.email;
  if (!to) throw new Error("This contact has no email address");
  const doc = await buildInvoicePdf(inv);
  const content = await blobToBase64(doc.output("blob"));

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      client_id: inv.clientId,
      contact_id: inv.contactId,
      to,
      subject: `${opts.reminder ? "Reminder: " : ""}Invoice ${inv.number} from ${inv.business.name}`,
      html_body: invoiceEmailHtml(inv, !!opts.reminder),
      attachments: [{ filename: invoiceFileName(inv), content, content_type: "application/pdf" }],
      metadata: { invoice_id: inv.id, kind: opts.reminder ? "invoice_reminder" : "invoice" },
    },
  });
  const message = data?.error || (error ? (await (error as any).context?.json?.().catch(() => null))?.error || error.message : null);
  if (message) throw new Error(message);
  return to;
}
