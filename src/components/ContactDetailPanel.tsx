import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  X, Pencil, Save, Mail, Phone, User, Building2, Tag,
  Calendar, MessageSquare, Globe, MapPin, Star, ExternalLink, Camera, Loader2, Send, Clock, Trash2,
  Sparkles, ChevronDown, Receipt
} from "lucide-react";
import { CreateInvoiceDialog } from "@/components/payments/CreateInvoiceDialog";
import { BRAND } from "@/brand";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  lead_score: number | null;
  source: string | null;
  tags: string[] | null;
  last_contacted_at: string | null;
  company_id: string | null;
  client_id: string;
  avatar_url?: string | null;
}

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
}

interface ContactDetailPanelProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companies: Company[];
}

const statusOptions = ["Lead", "Prospect", "Client", "Inactive"];
const sourceOptions = ["Website", "Referral", "Facebook Ad", "Google Ad", "Walk-in", "Chat Widget", "Other"];
const statusColors: Record<string, string> = {
  Lead: "bg-info/10 text-info",
  Client: "bg-success/10 text-success",
  Prospect: "bg-warning/10 text-warning",
  Inactive: "bg-muted text-muted-foreground",
};

const ContactDetailPanel = ({ contact, open, onClose, onSaved, companies }: ContactDetailPanelProps) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [showAiWriter, setShowAiWriter] = useState(false);

  // Message (SMS) dialog
  const [messageOpen, setMessageOpen] = useState(false);
  const [smsBody, setSmsBody] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Book appointment dialog
  const [bookOpen, setBookOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [aptDate, setAptDate] = useState("");
  const [aptTime, setAptTime] = useState("09:00");
  const [aptService, setAptService] = useState("");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptNotes, setAptNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [calUrl, setCalUrl] = useState<string | null>(null);
  const [loadingCalUrl, setLoadingCalUrl] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "Lead",
    lead_score: 50,
    source: "",
    tags: [] as string[],
    company_id: "" as string | null,
    avatar_url: "" as string | null,
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || "",
        phone: contact.phone || "",
        status: contact.status || "Lead",
        lead_score: contact.lead_score ?? 50,
        source: contact.source || "",
        tags: contact.tags || [],
        company_id: contact.company_id || null,
        avatar_url: (contact as any).avatar_url || null,
      });
      setEditing(false);
    }
  }, [contact]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!contact || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${contact.client_id}/${contact.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("contact-avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("contact-avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("contacts").update({ avatar_url: avatarUrl } as any).eq("id", contact.id);
      setForm(f => ({ ...f, avatar_url: avatarUrl }));
      toast.success("Photo updated!");
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || null,
          phone: form.phone || null,
          status: form.status,
          lead_score: form.lead_score,
          source: form.source || null,
          tags: form.tags,
          company_id: form.company_id || null,
        })
        .eq("id", contact.id);
      if (error) throw error;
      toast.success("Contact updated successfully");
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  // Fetch Cal.com URL when book dialog opens
  useEffect(() => {
    if (!bookOpen || !contact) return;
    setLoadingCalUrl(true);
    supabase
      .from("clients")
      .select("cal_url")
      .eq("id", contact.client_id)
      .maybeSingle()
      .then(({ data }) => {
        setCalUrl(data?.cal_url || null);
        setLoadingCalUrl(false);
      });
  }, [bookOpen, contact]);

  const getCalEmbedUrl = (url: string) => {
    let cleaned = url.trim();
    if (!cleaned.startsWith("http")) cleaned = `https://${cleaned}`;
    try {
      const parsed = new URL(cleaned);
      if (parsed.hostname.includes("cal.com")) {
        // Pre-fill contact name & email if available
        const params = new URLSearchParams({
          embed: "true",
          layout: "month_view",
          hideBranding: "true",
        });
        if (contact?.first_name) params.set("name", `${contact.first_name} ${contact.last_name}`);
        if (contact?.email) params.set("email", contact.email);
        return `${cleaned}${cleaned.includes("?") ? "&" : "?"}${params.toString()}`;
      }
    } catch { /* invalid URL */ }
    return "";
  };

  // --- Send Email ---
  const handleSendEmail = async () => {
    if (!contact || !contact.email) return;
    if (!emailSubject.trim()) { toast.error("Subject is required"); return; }
    if (!emailBody.trim()) { toast.error("Message body is required"); return; }
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: contact.email,
          subject: emailSubject.trim(),
          html_body: `<p>${emailBody.trim().replace(/\n/g, "<br/>")}</p>`,
          client_id: contact.client_id,
          contact_id: contact.id,
          sender_name: user?.fullName || "Agent",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Email sent!");
      setEmailOpen(false);
      setEmailSubject("");
      setEmailBody("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // --- AI Email Writer ---
  const handleGenerateEmail = async () => {
    if (!contact || !aiPrompt.trim()) { toast.error("Please describe what you want to write"); return; }
    setGeneratingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          client_id: contact.client_id,
          contact_id: contact.id,
          prompt: aiPrompt.trim(),
          tone: aiTone,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.subject) setEmailSubject(data.subject);
      if (data?.body) setEmailBody(data.body);
      toast.success("Email drafted by AI");
      setShowAiWriter(false);
      setAiPrompt("");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  // --- Send SMS ---
  const handleSendSms = async () => {
    if (!contact || !contact.phone) return;
    if (!smsBody.trim()) { toast.error("Message is required"); return; }
    setSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: contact.phone,
          body: smsBody.trim(),
          client_id: contact.client_id,
          contact_id: contact.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Message sent!");
      setMessageOpen(false);
      setSmsBody("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSendingSms(false);
    }
  };

  // --- Book Appointment ---
  const generateICS = (scheduledAt: string, durationMin: number, service: string, contactName: string) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMin * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${BRAND.name}//Appointments//EN`,
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${service || "Appointment"}`,
      `DESCRIPTION:Appointment with ${contactName}`,
      `UID:${crypto.randomUUID()}@sugarandleather.com`,
      "STATUS:CONFIRMED",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
  };

  const handleBookAppointment = async () => {
    if (!contact) return;
    if (!aptDate) { toast.error("Date is required"); return; }
    setBooking(true);
    try {
      const clientId = contact.client_id;
      const scheduled_at = new Date(`${aptDate}T${aptTime}`).toISOString();
      const durationMin = parseInt(aptDuration);
      const contactName = `${contact.first_name} ${contact.last_name}`;

      // 1. Create the appointment
      const { error } = await supabase.from("appointments").insert({
        client_id: clientId,
        contact_id: contact.id,
        scheduled_at,
        service: aptService || null,
        notes: aptNotes || null,
        duration_minutes: durationMin,
      });
      if (error) throw error;

      // 2. Send calendar invite email if contact has email
      if (contact.email) {
        const icsContent = generateICS(scheduled_at, durationMin, aptService, contactName);
        const { error: icsError } = await supabase.functions.invoke("send-ics-email", {
          body: {
            to: contact.email,
            contact_name: contactName,
            service: aptService || "Appointment",
            scheduled_at,
            ics_content: icsContent,
            client_id: clientId,
          },
        });
        if (icsError) {
          console.error("Failed to send calendar invite:", icsError);
          toast.success("Appointment booked! (calendar invite failed to send)");
        } else {
          toast.success("Appointment booked & calendar invite sent!");
        }
      } else {
        toast.success("Appointment booked! (no email on file to send invite)");
      }

      setBookOpen(false);
      setAptDate("");
      setAptTime("09:00");
      setAptService("");
      setAptDuration("30");
      setAptNotes("");
    } catch (e: any) {
      toast.error(e.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contact) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw error;
      toast.success("Contact deleted");
      setDeleteOpen(false);
      onClose();
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete contact");
    } finally {
      setDeleting(false);
    }
  };

  const linkedCompany = companies.find(c => c.id === form.company_id);

  if (!contact) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 z-40" onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {editing ? (
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="w-4 h-4 mr-1" />Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Avatar & Name */}
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-background" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold ring-4 ring-background">
                      {contact.first_name[0]}{contact.last_name[0]}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="mt-3">
                  {editing ? (
                    <div className="flex gap-2 w-full max-w-xs">
                      <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First" className="text-center" />
                      <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last" className="text-center" />
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-foreground">{contact.first_name} {contact.last_name}</h2>
                  )}
                </div>
                {linkedCompany && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{linkedCompany.name}
                  </p>
                )}
                <div className="mt-2">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[form.status] || statusColors.Lead)}>
                    {form.status}
                  </span>
                </div>
              </div>

              {/* Quick Action Icons */}
              <div className="flex justify-center gap-3 mt-4">
                {[
                  { icon: Mail, label: "Email", action: () => {
                    if (!contact.email) { toast.error("No email on file for this contact"); return; }
                    setEmailOpen(true);
                  }},
                  { icon: Phone, label: "Call", action: () => {
                    if (!contact.phone) { toast.error("No phone on file for this contact"); return; }
                    window.open(`tel:${contact.phone}`);
                  }},
                  { icon: MessageSquare, label: "Message", action: () => {
                    if (!contact.phone) { toast.error("No phone on file — SMS requires a phone number"); return; }
                    setMessageOpen(true);
                  }},
                  { icon: Calendar, label: "Book", action: () => setBookOpen(true) },
                  { icon: Receipt, label: "Invoice", action: () => setInvoiceOpen(true) },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action} className="w-10 h-10 rounded-full bg-background border flex items-center justify-center hover:bg-accent transition-colors" title={label}>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Detailed Information */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />Detailed Information
                </h3>
                <div className="space-y-3">
                  <InfoRow icon={Mail} label="Email" editing={editing}
                    value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                  <InfoRow icon={Phone} label="Phone" editing={editing}
                    value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                  <InfoRow icon={Globe} label="Source" editing={editing}
                    value={form.source} onChange={v => setForm(f => ({ ...f, source: v }))}
                    type="select" options={sourceOptions} />
                </div>
              </div>

              <Separator />

              {/* Status & Score */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />Status & Scoring
                </h3>
                <div className="space-y-3">
                  {editing ? (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Lead Score</Label>
                        <Input type="number" min={0} max={100} value={form.lead_score}
                          onChange={e => setForm(f => ({ ...f, lead_score: Number(e.target.value) }))} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Lead Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${form.lead_score}%` }} />
                          </div>
                          <span className="text-sm font-semibold">{form.lead_score}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last Contacted</span>
                        <span className="text-sm">{contact.last_contacted_at || "Never"}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Company */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />Company
                </h3>
                {editing ? (
                  <Select value={form.company_id || "none"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="Link a company..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.industry ? `• ${c.industry}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : linkedCompany ? (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{linkedCompany.name}</span>
                    </div>
                    {linkedCompany.industry && (
                      <p className="text-xs text-muted-foreground mt-1">{linkedCompany.industry}</p>
                    )}
                    {linkedCompany.website && (
                      <a href={linkedCompany.website} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                        <ExternalLink className="w-3 h-3" />{linkedCompany.website}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No company linked</p>
                )}
              </div>

              <Separator />

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />Tags
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      {editing && (
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">×</button>
                      )}
                    </Badge>
                  ))}
                  {form.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags</p>}
                </div>
                {editing && (
                  <div className="flex gap-1">
                    <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..."
                      className="text-sm h-8" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
                    <Button size="sm" variant="outline" className="h-8" onClick={addTag}>Add</Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <CreateInvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} contactId={contact.id} />

          {/* Email Dialog */}
          <Dialog open={emailOpen} onOpenChange={(open) => { setEmailOpen(open); if (!open) setShowAiWriter(false); }}>
            <DialogContent className="sm:max-w-lg z-[60]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Mail className="w-4 h-4" />Send Email</DialogTitle>
                <DialogDescription>
                  Send an email to {contact.first_name} {contact.last_name} ({contact.email})
                </DialogDescription>
              </DialogHeader>

              {/* AI Writer Toggle */}
              <button
                onClick={() => setShowAiWriter(!showAiWriter)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                  showAiWriter
                    ? "border-ember-300 bg-ember-50 text-ember-700 dark:border-ember-800 dark:bg-obsidian dark:text-ember-300"
                    : "border-border text-muted-foreground hover:border-ember-300 hover:text-ember-600"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Writer — describe what you want and let AI draft it
                <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", showAiWriter && "rotate-180")} />
              </button>

              {/* AI Writer Panel */}
              {showAiWriter && (
                <div className="space-y-2.5 rounded-lg border border-ember-200 bg-ember-50/50 p-3 dark:border-ember-900 dark:bg-obsidian/50">
                  <div>
                    <Label className="text-xs text-ember-700 dark:text-ember-300">What should the email say?</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Follow up on our meeting last week, thank them for their interest in our services, and suggest scheduling a demo call next Tuesday..."
                      className="mt-1 min-h-[80px] resize-none text-sm bg-white dark:bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-ember-700 dark:text-ember-300">Tone</Label>
                      <Select value={aiTone} onValueChange={setAiTone}>
                        <SelectTrigger className="mt-1 h-8 text-xs bg-white dark:bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="empathetic">Empathetic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateEmail}
                      disabled={generatingEmail || !aiPrompt.trim()}
                      className="mt-5 gap-1.5 bg-ember-600 hover:bg-ember-700 text-white"
                    >
                      {generatingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {generatingEmail ? "Writing..." : "Generate"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Message</Label>
                  <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                    placeholder="Write your email or use the AI writer above..." className="mt-1 min-h-[120px] resize-none" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail} className="gap-1.5">
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* SMS/Message Dialog */}
          <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
            <DialogContent className="sm:max-w-md z-[60]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Send Message</DialogTitle>
                <DialogDescription>
                  Send an SMS to {contact.first_name} {contact.last_name} ({contact.phone})
                </DialogDescription>
              </DialogHeader>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea value={smsBody} onChange={e => setSmsBody(e.target.value)}
                  placeholder="Type your message..." className="mt-1 min-h-[100px] resize-none" maxLength={1600} />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{smsBody.length}/1600</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
                <Button onClick={handleSendSms} disabled={sendingSms} className="gap-1.5">
                  {sendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingSms ? "Sending..." : "Send SMS"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-sm z-[60]">
              <DialogHeader>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {contact.first_name} {contact.last_name}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteContact} disabled={deleting}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Book Appointment Dialog */}
          <Dialog open={bookOpen} onOpenChange={setBookOpen}>
            <DialogContent className={cn("z-[60]", calUrl ? "sm:max-w-2xl" : "sm:max-w-md")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" />Book Appointment</DialogTitle>
                <DialogDescription>
                  Schedule an appointment for {contact.first_name} {contact.last_name}
                </DialogDescription>
              </DialogHeader>
              {loadingCalUrl ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : calUrl && getCalEmbedUrl(calUrl) ? (
                <div className="w-full" style={{ height: "500px" }}>
                  <iframe
                    src={getCalEmbedUrl(calUrl)}
                    className="w-full h-full border-0 rounded-lg"
                    title="Cal.com Booking"
                    allow="camera; microphone"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input type="date" value={aptDate} onChange={e => setAptDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input type="time" value={aptTime} onChange={e => setAptTime(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Service</Label>
                        <Input value={aptService} onChange={e => setAptService(e.target.value)}
                          placeholder="e.g. Consultation" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <Select value={aptDuration} onValueChange={setAptDuration}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["15", "30", "45", "60", "90"].map(d => (
                              <SelectItem key={d} value={d}>{d} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={aptNotes} onChange={e => setAptNotes(e.target.value)}
                        placeholder="Optional notes..." className="mt-1 resize-none" rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
                    <Button onClick={handleBookAppointment} disabled={booking} className="gap-1.5">
                      {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      {booking ? "Booking..." : "Book Appointment"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
};

function InfoRow({ icon: Icon, label, value, editing, onChange, type = "text", options }: {
  icon: any; label: string; value: string; editing: boolean;
  onChange: (v: string) => void; type?: "text" | "select"; options?: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {editing ? (
          type === "select" && options ? (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 text-sm" />
          )
        ) : (
          <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

export default ContactDetailPanel;
