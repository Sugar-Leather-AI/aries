import { useState, useEffect, useRef, useCallback } from "react";

import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle, GripVertical, DollarSign, Target, TrendingUp, Clock, Loader2, Sparkles, Pencil, Building2, X, FolderKanban } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { AddDealDialog, SearchSelect, DEAL_STAGES, useAnnounceWonDeal } from "@/components/deals/AddDealDialog";

const stages = DEAL_STAGES;
const stageAccents: Record<string, string> = {
  "New Lead": "from-blue-500/80 to-blue-400/60",
  "Contacted": "from-ember-500/80 to-ember-400/60",
  "Qualified": "from-amber-500/80 to-amber-400/60",
  "Proposal Sent": "from-orange-500/80 to-orange-400/60",
  "Won": "from-emerald-500/80 to-emerald-400/60",
};

interface Deal {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  company_id: string | null;
  company_name: string | null;
  title: string;
  value: number | null;
  stage: string | null;
  ai_score: number | null;
  days_in_stage: number | null;
  notes: string | null;
  expected_close_date: string | null;
  client_id: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
}

const Pipeline = () => {
  const announceProject = useAnnounceWonDeal();
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addStage, setAddStage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({ title: "", contact_id: "", company_id: "", value: "", stage: "New Lead", notes: "" });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  // Quick-add inline state
  const [quickContact, setQuickContact] = useState(false);
  const [quickCompany, setQuickCompany] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [savingQuick, setSavingQuick] = useState<"contact" | "company" | null>(null);

  const resetForm = () => setForm({ title: "", contact_id: "", company_id: "", value: "", stage: "New Lead", notes: "" });

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
      }).select("id, first_name, last_name, email").single();
      if (error) throw error;
      setContacts(prev => [...prev, data as Contact].sort((a, b) => a.first_name.localeCompare(b.first_name)));
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
      setCompanies(prev => [...prev, data as Company].sort((a, b) => a.name.localeCompare(b.name)));
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

  const fetchDeals = async () => {
    const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Failed to load deals"); }
    else setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase.from("contacts").select("id, first_name, last_name, email").order("first_name");
    if (!error && data) setContacts(data as Contact[]);
  };

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from("companies").select("id, name, domain").order("name");
    if (!error && data) setCompanies(data as Company[]);
  };

  // The project each deal turned into (projects.deal_id).
  const [projectByDeal, setProjectByDeal] = useState<Record<string, { id: string; name: string }>>({});
  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name, deal_id").not("deal_id", "is", null);
    setProjectByDeal(Object.fromEntries(((data as any[]) || []).map((p) => [p.deal_id, { id: p.id, name: p.name }])));
  };
  useEffect(() => { fetchDeals(); fetchContacts(); fetchCompanies(); fetchProjects(); }, []);

  // ?deal=<id> opens that deal (e.g. from its project).
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const id = params.get("deal");
    if (!id || !deals.length) return;
    const d = deals.find((x) => x.id === id);
    if (d) openEditDeal(d);
    params.delete("deal"); setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  const stageDeals = stages.map(stage => ({
    stage,
    deals: deals.filter(d => d.stage === stage),
    total: deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.value || 0), 0),
  }));

  // Won deals are closed, so they don't count toward the open pipeline.
  const openDeals = deals.filter(d => d.stage !== "Won");
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonDeals = deals.filter(d => d.stage === "Won");
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;
  const allDealsValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  const avgDealSize = deals.length > 0 ? Math.round(allDealsValue / deals.length) : 0;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    setDeals(prev => prev.map(d => d.id === draggableId ? { ...d, stage: newStage, days_in_stage: 0 } : d));
    
    const { error } = await supabase.from("deals").update({ stage: newStage, days_in_stage: 0 }).eq("id", draggableId);
    if (error) { toast.error("Failed to update deal"); fetchDeals(); }
    else if (newStage === "Won" && source.droppableId !== "Won") announceProject(draggableId);
    else toast.success(`Deal moved to ${newStage}`);
  };

  const openAddForStage = (stage: string) => {
    setAddStage(stage);
    setForm(f => ({ ...f, stage }));
    setShowAdd(true);
  };

  const generateAIDescription = async () => {
    if (!form.title) { toast.error("Enter a deal title first"); return; }
    setGeneratingAI(true);
    try {
      const selectedContact = contacts.find(c => c.id === form.contact_id);
      const contactName = selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "";
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { type: "deal", context: { title: form.title, contact_name: contactName, value: form.value, stage: addStage || form.stage } },
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

  const openEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setForm({
      title: deal.title,
      contact_id: deal.contact_id || "",
      company_id: deal.company_id || "",
      value: deal.value != null ? String(deal.value) : "",
      stage: deal.stage || "New Lead",
      notes: deal.notes || "",
    });
    setAddStage(deal.stage || "New Lead");
    setShowEdit(true);
  };

  const handleEditDeal = async () => {
    if (!editingDeal || !form.title) { toast.error("Deal title is required"); return; }
    setSaving(true);
    try {
      const selectedContact = contacts.find(c => c.id === form.contact_id);
      const contactName = selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : null;
      const selectedCompany = companies.find(c => c.id === form.company_id);
      const companyName = selectedCompany ? selectedCompany.name : null;
      const { error } = await supabase.from("deals").update({
        title: form.title,
        contact_id: form.contact_id || null,
        contact_name: contactName,
        company_id: form.company_id || null,
        company_name: companyName,
        value: form.value ? Number(form.value) : 0,
        stage: form.stage,
        notes: form.notes || null,
      }).eq("id", editingDeal.id);
      if (error) throw error;
      if (form.stage === "Won" && editingDeal.stage !== "Won") announceProject(editingDeal.id);
      else toast.success("Deal updated!");
      setShowEdit(false);
      setEditingDeal(null);
      resetForm();
      setAddStage(null);
      fetchDeals();
    } catch (e: any) {
      toast.error(e.message || "Failed to update deal");
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: "Total Pipeline", value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Deals", value: String(openDeals.length), icon: Target, color: "text-ember-600", bg: "bg-ember-500/10" },
    { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Avg Deal Size", value: `$${avgDealSize.toLocaleString()}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{deals.length} deals in your pipeline</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />Add Deal
        </Button>
      </div>

      {/* Stats - Redesigned */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5 truncate">{stat.value}</p>
              </div>
            </div>
            {/* Decorative accent */}
            <div className={cn("absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-[0.07]", stat.bg.replace("/10", "/100"))} />
          </motion.div>
        ))}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stageDeals.map((col, ci) => (
              <motion.div
                key={col.stage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.08 }}
                className="kanban-column bg-muted/30 min-w-[240px]"
              >
                {/* Column header with colored accent */}
                <div className="mb-3">
                  <div className={cn("h-1 rounded-full bg-gradient-to-r mb-3", stageAccents[col.stage])} />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{col.stage}</h3>
                      <p className="text-xs text-muted-foreground">{col.deals.length} deals · ${col.total.toLocaleString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-accent"
                      onClick={() => openAddForStage(col.stage)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Droppable droppableId={col.stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn("space-y-2 min-h-[60px] transition-colors rounded-lg p-1", snapshot.isDraggingOver && "bg-accent/40")}
                    >
                      {col.deals.map((deal, di) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={di}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              onClick={() => openEditDeal(deal)}
                              className={cn(
                                "deal-card group cursor-pointer",
                                col.stage === "Won" && "border-l-2 border-l-emerald-500",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-sm truncate">{deal.contact_name || "—"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{deal.title}</p>
                                  {deal.company_name && (
                                    <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-0.5 mt-0.5">
                                      <Building2 className="w-2.5 h-2.5" />{deal.company_name}
                                    </p>
                                  )}
                                </div>
                                <div
                                  {...provided.dragHandleProps}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-semibold text-foreground">${(deal.value || 0).toLocaleString()}</span>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i < Math.round((deal.ai_score || 0) / 20) ? "bg-primary" : "bg-muted")} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                {projectByDeal[deal.id] ? (
                                  <Link to={`/projects?project=${projectByDeal[deal.id].id}`} onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 truncate max-w-[70%]" title="Open project">
                                    <FolderKanban className="w-3 h-3 shrink-0" />{projectByDeal[deal.id].name}
                                  </Link>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">{deal.days_in_stage || 0}d in stage</span>
                                )}
                                {(deal.days_in_stage || 0) > 4 && col.stage !== "Won" && (
                                  <span className="text-[10px] text-warning flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" />follow up!
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Add Deal Dialog (shared with the Inbox) */}
      <AddDealDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setAddStage(null); }}
        defaults={addStage ? { stage: addStage } : undefined}
        onCreated={() => fetchDeals()}
      />

      {/* Edit Deal Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) { setEditingDeal(null); resetForm(); setAddStage(null); setQuickContact(false); setQuickCompany(false); setNewContactName(""); setNewContactEmail(""); setNewCompanyName(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Deal
            </DialogTitle>
            <DialogDescription>Update the deal details</DialogDescription>
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
                  onChange={id => setForm(f => ({ ...f, contact_id: id }))}
                  options={contacts.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}` }))}
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
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
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
            {editingDeal && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <FolderKanban className="w-4 h-4 text-primary shrink-0" />
                {projectByDeal[editingDeal.id] ? (
                  <>
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-medium text-foreground truncate">{projectByDeal[editingDeal.id].name}</span>
                    <Link to={`/projects?project=${projectByDeal[editingDeal.id].id}`} className="ml-auto text-xs font-medium text-primary hover:underline shrink-0">Open project</Link>
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">No project yet. One is created when this deal is won, or link one from Projects.</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowEdit(false); setEditingDeal(null); resetForm(); setAddStage(null); }}>Cancel</Button>
            <Button onClick={handleEditDeal} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pipeline;
