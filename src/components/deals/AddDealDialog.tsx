import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const DEAL_STAGES = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won"];

export interface DealContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_id?: string | null;
}

export interface DealCompany {
  id: string;
  name: string;
  domain: string | null;
}

interface SearchSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}

export const SearchSelect = ({ value, onChange, options, placeholder = "Search..." }: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.id === value);
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const close = useCallback(() => { setOpen(false); setQuery(""); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-left flex items-center justify-between gap-2 hover:bg-accent/40 transition-colors"
      >
        <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
          {selected ? selected.label : `— ${placeholder} —`}
        </span>
        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-1.5 border-b">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 rounded px-2 text-xs bg-muted/50 outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); close(); }}
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              — None —
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(o.id); close(); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors",
                    value === o.id && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Winning a deal creates its project (database trigger). Offers a shortcut to it. */
export function useAnnounceWonDeal() {
  const navigate = useNavigate();
  return useCallback(async (dealId: string) => {
    const { data } = await supabase.from("projects").select("id, name").eq("deal_id", dealId).maybeSingle();
    if (!data) { toast.success("Deal won"); return; }
    toast.success(`Deal won. Project "${data.name}" is ready`, {
      action: { label: "Open project", onClick: () => navigate(`/projects?project=${data.id}`) },
    });
  }, [navigate]);
}

export interface AddDealDefaults {
  stage?: string;
  /** An existing contact to put on the deal. Its company is filled in too. */
  contactId?: string;
  /** No contact yet (e.g. an unknown email sender): opens "New contact" with these filled in. */
  newContact?: { name: string; email: string };
}

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: AddDealDefaults;
  onCreated?: (dealId: string) => void;
}

const emptyForm = { title: "", contact_id: "", company_id: "", value: "", stage: "New Lead", notes: "" };

/** The "Add Deal" dialog, shared by the Pipeline and the Inbox. */
export function AddDealDialog({ open, onOpenChange, defaults, onCreated }: AddDealDialogProps) {
  const announceWon = useAnnounceWonDeal();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [contacts, setContacts] = useState<DealContact[]>([]);
  const [companies, setCompanies] = useState<DealCompany[]>([]);

  const [quickContact, setQuickContact] = useState(false);
  const [quickCompany, setQuickCompany] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [savingQuick, setSavingQuick] = useState<"contact" | "company" | null>(null);

  // Fresh form, contacts and companies each time it opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setForm({ ...emptyForm, stage: defaults?.stage || "New Lead", contact_id: defaults?.contactId || "" });
    setQuickCompany(false);
    setNewCompanyName("");
    setQuickContact(!!defaults?.newContact);
    setNewContactName(defaults?.newContact?.name || "");
    setNewContactEmail(defaults?.newContact?.email || "");
    (async () => {
      const [{ data: c }, { data: co }] = await Promise.all([
        supabase.from("contacts").select("id, first_name, last_name, email, company_id").order("first_name"),
        supabase.from("companies").select("id, name, domain").order("name"),
      ]);
      if (cancelled) return;
      setContacts((c as DealContact[]) || []);
      setCompanies((co as DealCompany[]) || []);
      const preset = (c as DealContact[] | null)?.find(x => x.id === defaults?.contactId);
      if (preset?.company_id) setForm(f => (f.company_id ? f : { ...f, company_id: preset.company_id! }));
    })();
    return () => { cancelled = true; };
  }, [open, defaults?.stage, defaults?.contactId, defaults?.newContact?.name, defaults?.newContact?.email]);

  const pickContact = (id: string) => {
    const contact = contacts.find(c => c.id === id);
    setForm(f => ({ ...f, contact_id: id, company_id: f.company_id || contact?.company_id || "" }));
  };

  const saveQuickContact = async () => {
    if (!newContactName.trim()) return;
    setSavingQuick("contact");
    const [first, ...rest] = newContactName.trim().split(" ");
    try {
      const { data: clientId } = await supabase.rpc("ensure_user_client_id");
      const { data, error } = await supabase.from("contacts").insert({
        client_id: clientId,
        first_name: first,
        last_name: rest.join(" ") || "",
        email: newContactEmail.trim() || null,
      }).select("id, first_name, last_name, email, company_id").single();
      if (error) throw error;
      setContacts(prev => [...prev, data as DealContact].sort((a, b) => a.first_name.localeCompare(b.first_name)));
      setForm(f => ({ ...f, contact_id: data.id }));
      setQuickContact(false);
      setNewContactName("");
      setNewContactEmail("");
      toast.success("Contact added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add contact");
    } finally {
      setSavingQuick(null);
    }
  };

  const saveQuickCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSavingQuick("company");
    try {
      const { data: clientId } = await supabase.rpc("ensure_user_client_id");
      const { data, error } = await supabase.from("companies").insert({
        client_id: clientId,
        name: newCompanyName.trim(),
      }).select("id, name, domain").single();
      if (error) throw error;
      setCompanies(prev => [...prev, data as DealCompany].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, company_id: data.id }));
      setQuickCompany(false);
      setNewCompanyName("");
      toast.success("Company added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add company");
    } finally {
      setSavingQuick(null);
    }
  };

  const generateAIDescription = async () => {
    if (!form.title) { toast.error("Enter a deal title first"); return; }
    setGeneratingAI(true);
    try {
      const selectedContact = contacts.find(c => c.id === form.contact_id);
      const contactName = selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "";
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { type: "deal", context: { title: form.title, contact_name: contactName, value: form.value, stage: form.stage } },
      });
      if (error) throw error;
      if (data?.description) setForm(f => ({ ...f, notes: data.description }));
      else toast.error("No description generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate description");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleAddDeal = async () => {
    if (!form.title) { toast.error("Deal title is required"); return; }
    setSaving(true);
    try {
      const { data: clientId, error: ensureError } = await supabase.rpc("ensure_user_client_id");
      if (ensureError || !clientId) { toast.error("Failed to set up your account"); return; }

      const selectedContact = contacts.find(c => c.id === form.contact_id);
      const contactName = selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}`.trim() : null;
      const selectedCompany = companies.find(c => c.id === form.company_id);

      const { data: created, error } = await supabase.from("deals").insert({
        client_id: clientId,
        title: form.title,
        contact_id: form.contact_id || null,
        contact_name: contactName,
        company_id: form.company_id || null,
        company_name: selectedCompany ? selectedCompany.name : null,
        value: form.value ? Number(form.value) : 0,
        stage: form.stage,
        notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;
      if (form.stage === "Won") announceWon(created.id);
      else toast.success("Deal created!");
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to create deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Add Deal
          </DialogTitle>
          <DialogDescription>Create a new deal in your pipeline{defaults?.stage ? ` under "${defaults.stage}"` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Deal Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Website Redesign" className="bg-card" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Contact</Label>
                <button type="button" onClick={() => { setQuickContact(v => !v); setQuickCompany(false); }}
                  className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                  {quickContact ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {quickContact ? "Cancel" : "New"}
                </button>
              </div>
              <SearchSelect
                value={form.contact_id}
                onChange={pickContact}
                options={contacts.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}`.trim() }))}
                placeholder="Select contact"
              />
              {quickContact && (
                <div className="mt-2 p-2 rounded-lg border bg-muted/30 space-y-1.5">
                  <Input placeholder="Full name *" value={newContactName} onChange={e => setNewContactName(e.target.value)}
                    className="h-7 text-xs bg-card" onKeyDown={e => e.key === "Enter" && saveQuickContact()} />
                  <Input placeholder="Email (optional)" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)}
                    className="h-7 text-xs bg-card" onKeyDown={e => e.key === "Enter" && saveQuickContact()} />
                  <Button size="sm" className="h-6 w-full text-xs" onClick={saveQuickContact} disabled={savingQuick === "contact" || !newContactName.trim()}>
                    {savingQuick === "contact" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Contact"}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Company</Label>
                <button type="button" onClick={() => { setQuickCompany(v => !v); setQuickContact(false); }}
                  className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                  {quickCompany ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {quickCompany ? "Cancel" : "New"}
                </button>
              </div>
              <SearchSelect
                value={form.company_id}
                onChange={id => setForm(f => ({ ...f, company_id: id }))}
                options={companies.map(c => ({ id: c.id, label: c.name + (c.domain ? ` (${c.domain})` : "") }))}
                placeholder="Select company"
              />
              {quickCompany && (
                <div className="mt-2 p-2 rounded-lg border bg-muted/30 space-y-1.5">
                  <Input placeholder="Company name *" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                    className="h-7 text-xs bg-card" onKeyDown={e => e.key === "Enter" && saveQuickCompany()} />
                  <Button size="sm" className="h-6 w-full text-xs" onClick={saveQuickCompany} disabled={savingQuick === "company" || !newCompanyName.trim()}>
                    {savingQuick === "company" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Company"}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Value ($)</Label>
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" className="bg-card" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Stage</Label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm"
              >
                {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary" onClick={generateAIDescription} disabled={generatingAI}>
                {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generatingAI ? "Generating..." : "AI Generate"}
              </Button>
            </div>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe this deal..." rows={3} className="bg-card resize-none" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddDeal} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Creating..." : "Create Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
