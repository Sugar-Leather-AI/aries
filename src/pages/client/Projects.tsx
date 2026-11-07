import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderKanban, MoreHorizontal, Calendar as CalendarIcon,
  User, Tag, Flag, Trash2, Edit3, X, Search, Filter,
  Clock, CheckCircle2, Circle, AlertCircle, Users, UserPlus, Shield, Mail,
  Target, DollarSign, TrendingUp, BarChart3, Milestone as MilestoneIcon, ChevronRight, ChevronDown,
  Sparkles, Loader2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { localDate, isPastDue } from "@/lib/dates";
import { Link, useSearchParams } from "react-router-dom";

type Project = {
  id: string; client_id: string; name: string; description: string | null;
  status: string; color: string | null; created_at: string;
  total_budget?: number | null; actual_cost?: number | null;
  contact_id?: string | null; technologies?: string[] | null; deal_id?: string | null;
};

type DealOption = {
  id: string; title: string; company_name: string | null; contact_name: string | null;
  contact_id: string | null; value: number | null; stage: string | null;
};

type Contact = {
  id: string; first_name: string; last_name: string; email: string | null;
};

type Milestone = {
  id: string; project_id: string; client_id: string; title: string;
  description: string | null; due_date: string | null; status: string;
  budget: number | null; actual_cost: number | null; position: number | null;
  created_at: string;
};

type Task = {
  id: string; project_id: string; client_id: string; milestone_id: string | null;
  title: string; description: string | null; status: string; priority: string | null;
  assigned_to: string | null; assigned_name: string | null; due_date: string | null;
  labels: string[] | null; position: number | null; created_at: string;
  estimated_hours?: number | null; actual_hours?: number | null;
};

type ProjectMember = {
  id: string; project_id: string; user_id: string; role: string; created_at: string;
  profile?: { full_name: string; email: string; avatar_url: string | null };
};

const TASK_STATUSES = [
  { id: "todo", label: "To Do", icon: Circle, color: "text-muted-foreground" },
  { id: "in_progress", label: "In Progress", icon: Clock, color: "text-warning" },
  { id: "review", label: "In Review", icon: AlertCircle, color: "text-primary" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-success" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-warning/10 text-warning" },
  { value: "high", label: "High", color: "bg-destructive/10 text-destructive" },
  { value: "urgent", label: "Urgent", color: "bg-destructive text-destructive-foreground" },
];

const MILESTONE_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "In Progress", color: "bg-warning/10 text-warning" },
  { value: "completed", label: "Completed", color: "bg-success/10 text-success" },
];

const PROJECT_COLORS = ["#CC6633", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  // ?project=<id> opens that project (e.g. from the Pipeline after a deal is won).
  const [searchParams] = useSearchParams();
  const [selectedProject, setSelectedProject] = useState<string | null>(searchParams.get("project"));
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [projectDealId, setProjectDealId] = useState("");
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectColor, setProjectColor] = useState("#CC6633");
  const [projectBudget, setProjectBudget] = useState("");
  const [projectContactId, setProjectContactId] = useState("");
  const [projectTechs, setProjectTechs] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedName, setTaskAssignedName] = useState("");
  // Everyone on the account's team (Settings > Team). Tasks can go to one of them or to any typed name.
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [taskLabels, setTaskLabels] = useState("");
  const [taskEstHours, setTaskEstHours] = useState("");
  const [taskActHours, setTaskActHours] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState<string>("none");

  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDueDate, setMsDueDate] = useState("");
  const [msBudget, setMsBudget] = useState("");
  const [msStatus, setMsStatus] = useState("not_started");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const clientId = user?.clientId;

  const fetchContacts = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase.from("contacts").select("id, first_name, last_name, email").order("first_name");
    if (data) setContacts(data as Contact[]);
  }, [clientId]);

  const fetchProjects = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase.from("projects").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (data) {
      setProjects(data);
      if (!selectedProject && data.length > 0) setSelectedProject(data[0].id);
    }
  }, [clientId, selectedProject]);

  const fetchMilestones = useCallback(async () => {
    if (!selectedProject) return;
    const { data } = await supabase.from("milestones").select("*").eq("project_id", selectedProject).order("position");
    if (data) {
      setMilestones(data);
      setExpandedMilestones(new Set(data.map(m => m.id)));
    }
  }, [selectedProject]);

  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    const { data } = await supabase.from("project_tasks").select("*").eq("project_id", selectedProject).order("position");
    if (data) setTasks(data);
  }, [selectedProject]);

  const fetchMembers = useCallback(async () => {
    if (!selectedProject) return;
    const { data } = await supabase.from("project_members").select("*").eq("project_id", selectedProject).order("created_at");
    if (data) {
      const userIds = data.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, avatar_url").in("user_id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setMembers(data.map(m => ({ ...m, profile: profileMap.get(m.user_id) as ProjectMember["profile"] })));
      } else setMembers([]);
    }
  }, [selectedProject]);

  const fetchDeals = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase.from("deals").select("id, title, company_name, contact_name, contact_id, value, stage").eq("client_id", clientId).order("created_at", { ascending: false });
    if (data) setDeals(data as DealOption[]);
  }, [clientId]);
  useEffect(() => { fetchProjects().finally(() => setLoading(false)); fetchContacts(); fetchDeals(); }, [fetchProjects, fetchContacts, fetchDeals]);
  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles").select("user_id, full_name, email").eq("client_id", clientId).order("full_name")
      .then(({ data }) => setTeamMembers(data || []));
  }, [clientId]);
  useEffect(() => { if (selectedProject) { fetchMilestones(); fetchTasks(); fetchMembers(); } }, [selectedProject, fetchMilestones, fetchTasks, fetchMembers]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const estHours = tasks.reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0);
    const actHours = tasks.reduce((s, t) => s + (Number(t.actual_hours) || 0), 0);
    // The project's own budget wins; the milestone budgets are a fallback when none is set.
    const project = projects.find(p => p.id === selectedProject);
    const totalBudget = Number(project?.total_budget) || milestones.reduce((s, m) => s + (Number(m.budget) || 0), 0);
    const totalCost = milestones.reduce((s, m) => s + (Number(m.actual_cost) || 0), 0) || Number(project?.actual_cost) || 0;
    const overdue = tasks.filter(t => t.due_date && isPastDue(t.due_date) && t.status !== "done").length;
    return { total, done, progress, estHours, actHours, totalBudget, totalCost, overdue };
  }, [tasks, milestones, selectedProject, projects]);

  const getMilestoneProgress = (msId: string) => {
    const msTasks = tasks.filter(t => t.milestone_id === msId);
    if (msTasks.length === 0) return 0;
    return Math.round((msTasks.filter(t => t.status === "done").length / msTasks.length) * 100);
  };

  // CRUD
  const createProject = async () => {
    if (!projectName.trim() || !clientId) return;
    const techs = projectTechs ? projectTechs.split(",").map(t => t.trim()).filter(Boolean) : [];
    const { data, error } = await supabase.from("projects").insert({
      client_id: clientId, name: projectName.trim(), description: projectDesc || null,
      color: projectColor, total_budget: projectBudget ? Number(projectBudget) : 0,
      contact_id: projectContactId || null, technologies: techs, deal_id: projectDealId || null,
    } as any).select().single();
    if (error) { toast.error(error.code === "23505" ? "That deal already has a project" : "Failed to create project"); return; }
    if (user?.id) await supabase.from("project_members").insert({ project_id: data.id, user_id: user.id, role: "owner" });
    setProjects(prev => [data, ...prev]);
    setSelectedProject(data.id);
    setShowNewProject(false);
    resetProjectForm();
    toast.success("Project created!");
  };

  const resetProjectForm = () => {
    setProjectName(""); setProjectDesc(""); setProjectColor("#CC6633");
    setProjectBudget(""); setProjectContactId(""); setProjectTechs(""); setProjectDealId("");
  };

  // Picking a deal fills in anything still empty from it.
  const pickDeal = (id: string) => {
    setProjectDealId(id);
    const d = deals.find(x => x.id === id);
    if (!d) return;
    if (!projectName.trim()) setProjectName(d.title);
    if (!projectContactId && d.contact_id) setProjectContactId(d.contact_id);
    if (!projectBudget && d.value) setProjectBudget(String(d.value));
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDesc(project.description || "");
    setProjectColor(project.color || "#CC6633");
    setProjectBudget(String(project.total_budget || ""));
    setProjectContactId(project.contact_id || "");
    setProjectTechs(project.technologies?.join(", ") || "");
    setProjectDealId(project.deal_id || "");
    setShowEditProject(true);
  };

  const updateProject = async () => {
    if (!editingProject || !projectName.trim()) return;
    const techs = projectTechs ? projectTechs.split(",").map(t => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("projects").update({
      name: projectName.trim(), description: projectDesc || null,
      color: projectColor, total_budget: projectBudget ? Number(projectBudget) : 0,
      contact_id: projectContactId || null, technologies: techs, deal_id: projectDealId || null,
    } as any).eq("id", editingProject.id);
    if (error) { toast.error(error.code === "23505" ? "That deal already has a project" : "Failed to update project"); return; }
    toast.success("Project updated!");
    setShowEditProject(false); setEditingProject(null); resetProjectForm();
    fetchProjects();
  };

  const generateProjectDesc = async () => {
    if (!projectName) { toast.error("Enter a project name first"); return; }
    setGeneratingAI(true);
    try {
      const selectedContact = contacts.find(c => c.id === projectContactId);
      const contactName = selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "";
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { type: "project", context: { name: projectName, contact_name: contactName, technologies: projectTechs, budget: projectBudget } },
      });
      if (error) throw error;
      if (data?.description) setProjectDesc(data.description);
    } catch (e: any) { toast.error(e.message || "Failed to generate description"); }
    finally { setGeneratingAI(false); }
  };

  const generateMilestoneDesc = async () => {
    if (!msTitle) { toast.error("Enter a milestone title first"); return; }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { type: "milestone", context: { title: msTitle, project_name: currentProject?.name, due_date: msDueDate, budget: msBudget } },
      });
      if (error) throw error;
      if (data?.description) setMsDesc(data.description);
    } catch (e: any) { toast.error(e.message || "Failed to generate description"); }
    finally { setGeneratingAI(false); }
  };

  const setProjectStatus = async (p: { id: string; name: string }, status: "completed" | "active") => {
    const { error } = await supabase.from("projects").update({ status }).eq("id", p.id);
    if (error) { toast.error("Could not update the project"); return; }
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
    if (status === "active") { toast.success(`${p.name} reopened`); return; }
    toast.success(`${p.name} marked as completed`);
    // Draft the Google review request now (it waits on Reputation for approval).
    const { data } = await supabase.functions.invoke("review-request", { body: { action: "prepare", project_id: p.id } });
    if (data?.id && !data?.skipped) {
      toast.success("A Google review request is ready to approve", {
        action: { label: "Review", onClick: () => { window.location.href = "/reputation"; } },
      });
    } else if (data?.skipped && !/is off/.test(data.skipped)) {
      toast(`No review request: ${data.skipped}`);
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject === id) setSelectedProject(projects.find(p => p.id !== id)?.id || null);
    toast.success("Project deleted");
  };

  const createOrUpdateMilestone = async () => {
    if (!msTitle.trim() || !clientId || !selectedProject) return;
    const msData = {
      title: msTitle.trim(), description: msDesc || null, due_date: msDueDate || null,
      budget: msBudget ? Number(msBudget) : 0, status: msStatus,
    };
    if (editingMilestone) {
      const { error } = await supabase.from("milestones").update(msData).eq("id", editingMilestone.id);
      if (error) { toast.error("Failed to update milestone"); return; }
      toast.success("Milestone updated");
    } else {
      const { error } = await supabase.from("milestones").insert({
        ...msData, project_id: selectedProject, client_id: clientId, position: milestones.length,
      }).select().single();
      if (error) { toast.error("Failed to create milestone"); return; }
      toast.success("Milestone created!");
    }
    resetMsForm();
    fetchMilestones();
  };

  const deleteMilestone = async (id: string) => {
    await supabase.from("milestones").delete().eq("id", id);
    fetchMilestones(); fetchTasks();
    toast.success("Milestone deleted");
  };

  // A name that matches a team member links the task to their account; anything else is kept as typed.
  const assigneeFields = (typed: string) => {
    const name = typed.trim();
    if (!name) return { assigned_name: null, assigned_to: null };
    const member = teamMembers.find(m =>
      (m.full_name || "").toLowerCase() === name.toLowerCase() || m.email.toLowerCase() === name.toLowerCase());
    return member
      ? { assigned_name: member.full_name || member.email, assigned_to: member.user_id }
      : { assigned_name: name, assigned_to: null };
  };

  const createOrUpdateTask = async () => {
    if (!taskTitle.trim() || !clientId || !selectedProject) return;
    const taskData = {
      title: taskTitle.trim(), description: taskDesc || null, priority: taskPriority,
      due_date: taskDueDate || null, ...assigneeFields(taskAssignedName),
      labels: taskLabels ? taskLabels.split(",").map(l => l.trim()).filter(Boolean) : [],
      estimated_hours: taskEstHours ? Number(taskEstHours) : 0,
      actual_hours: taskActHours ? Number(taskActHours) : 0,
      milestone_id: taskMilestoneId === "none" ? null : taskMilestoneId,
    };
    if (editingTask) {
      const { error } = await supabase.from("project_tasks").update(taskData as any).eq("id", editingTask.id);
      if (error) { toast.error("Failed to update task"); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("project_tasks").insert({
        ...taskData, project_id: selectedProject, client_id: clientId,
        status: newTaskStatus, position: tasks.filter(t => t.status === newTaskStatus).length,
      } as any).select().single();
      if (error) { toast.error("Failed to create task"); return; }
      toast.success("Task created!");
    }
    resetTaskForm();
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("project_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Task deleted");
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const resetTaskForm = () => {
    setShowNewTask(false); setEditingTask(null);
    setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");
    setTaskDueDate(""); setTaskAssignedName(""); setTaskLabels("");
    setTaskEstHours(""); setTaskActHours(""); setTaskMilestoneId("none");
  };

  const resetMsForm = () => {
    setShowNewMilestone(false); setEditingMilestone(null);
    setMsTitle(""); setMsDesc(""); setMsDueDate(""); setMsBudget(""); setMsStatus("not_started");
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title); setTaskDesc(task.description || "");
    setTaskPriority(task.priority || "medium"); setTaskDueDate(task.due_date || "");
    setTaskAssignedName(task.assigned_name || ""); setTaskLabels(task.labels?.join(", ") || "");
    setTaskEstHours(String(task.estimated_hours || "")); setTaskActHours(String(task.actual_hours || ""));
    setTaskMilestoneId(task.milestone_id || "none");
    setShowNewTask(true);
  };

  const openEditMilestone = (ms: Milestone) => {
    setEditingMilestone(ms);
    setMsTitle(ms.title); setMsDesc(ms.description || "");
    setMsDueDate(ms.due_date || ""); setMsBudget(String(ms.budget || ""));
    setMsStatus(ms.status);
    setShowNewMilestone(true);
  };

  const openNewTask = (status: string, milestoneId?: string | null) => {
    resetTaskForm();
    setNewTaskStatus(status);
    setNewTaskMilestoneId(milestoneId || null);
    setTaskMilestoneId(milestoneId || "none");
    setShowNewTask(true);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selectedProject) return;
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", inviteEmail.trim().toLowerCase()).single();
    if (!profile) { toast.error("No user found with that email"); return; }
    if (members.find(m => m.user_id === profile.user_id)) { toast.error("Already a member"); return; }
    const { error } = await supabase.from("project_members").insert({ project_id: selectedProject, user_id: profile.user_id, role: inviteRole });
    if (error) { toast.error("Failed to add member"); return; }
    toast.success("Member added!");
    setInviteEmail(""); setInviteRole("member"); setShowInviteMember(false);
    fetchMembers();
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    await supabase.from("project_members").update({ role: newRole }).eq("id", memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    toast.success("Role updated");
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("project_members").delete().eq("id", memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success("Member removed");
  };

  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const currentProject = projects.find(p => p.id === selectedProject);
  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Drag and drop
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverColumn(colId); };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = (colId: string) => {
    if (draggedTask) moveTask(draggedTask, colId);
    setDraggedTask(null); setDragOverColumn(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><FolderKanban className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={() => setShowNewProject(true)} className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
      </div>

      {/* Project tabs */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          {projects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)}
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border",
                selectedProject === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent")}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || "#CC6633" }} />
              {p.name}
              {p.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 opacity-80" aria-label="Completed" />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditProject(p)}>
                    <Edit3 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {p.status === "completed" ? (
                    <DropdownMenuItem onClick={() => setProjectStatus(p, "active")}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Reopen
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setProjectStatus(p, "completed")}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as completed
                    </DropdownMenuItem>
                  )}

      {/* The deal this project came from */}
      {currentProject && (() => {
        const d = deals.find(x => x.id === currentProject.deal_id);
        return (
          <div className="flex flex-wrap items-center gap-2 text-sm rounded-lg border bg-card px-3 py-2 relative z-10">
            <Target className="w-4 h-4 text-primary shrink-0" />
            {d ? (
              <>
                <span className="text-muted-foreground">Deal:</span>
                <span className="font-medium text-foreground">{d.title}</span>
                {d.company_name && <span className="text-muted-foreground">· {d.company_name}</span>}
                <span className="text-muted-foreground">· ${(d.value || 0).toLocaleString()}</span>
                {d.stage && <Badge variant="secondary" className="text-[10px]">{d.stage}</Badge>}
                <Link to={`/pipeline?deal=${d.id}`} className="ml-auto text-xs font-medium text-primary hover:underline">Open deal</Link>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Not linked to a deal.</span>
                <button type="button" onClick={() => openEditProject(currentProject)} className="text-xs font-medium text-primary hover:underline">Link a deal</button>
              </>
            )}
          </div>
        );
      })()}

                  <DropdownMenuItem className="text-destructive" onClick={() => deleteProject(p.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </button>
          ))}
        </div>
      )}

      {selectedProject && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 flex-wrap relative z-[5]">
            <TabsList>
              <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="milestones" className="gap-1.5"><Target className="w-3.5 h-3.5" /> Milestones</TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5"><FolderKanban className="w-3.5 h-3.5" /> Board</TabsTrigger>
              <TabsTrigger value="team" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Team</TabsTrigger>
            </TabsList>
            {activeTab === "board" && (
              <div className="flex items-center gap-3">
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[140px] h-9"><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === "milestones" && (
              <Button onClick={() => { resetMsForm(); setShowNewMilestone(true); }} size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Milestone</Button>
            )}
            {activeTab === "team" && (
              <Button onClick={() => setShowInviteMember(true)} size="sm" className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Add Member</Button>
            )}
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={CheckCircle2} label="Completion" value={`${stats.progress}%`} sub={`${stats.done}/${stats.total} tasks`} color="text-success" />
              <StatCard icon={Clock} label="Time Tracked" value={`${stats.actHours}h`} sub={`of ${stats.estHours}h estimated`} color="text-primary" />
              <StatCard icon={DollarSign} label="Budget Used" value={`$${stats.totalCost.toLocaleString()}`} sub={stats.totalBudget > 0 ? `of $${stats.totalBudget.toLocaleString()}` : "No budget set"} color="text-warning" />
              <StatCard icon={AlertCircle} label="Overdue Tasks" value={String(stats.overdue)} sub="need attention" color="text-destructive" />
            </div>

            {/* Overall Progress */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Overall Progress</h3>
              <Progress value={stats.progress} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.done} completed</span>
                <span>{stats.total - stats.done} remaining</span>
              </div>
            </Card>

            {/* Milestone Progress */}
            {milestones.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Milestone Progress</h3>
                <div className="space-y-3">
                  {milestones.map(ms => {
                    const prog = getMilestoneProgress(ms.id);
                    const msTasks = tasks.filter(t => t.milestone_id === ms.id);
                    return (
                      <div key={ms.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{ms.title}</span>
                          <div className="flex items-center gap-2">
                            {ms.due_date && <span className="text-xs text-muted-foreground">{localDate(ms.due_date).toLocaleDateString()}</span>}
                            <span className="text-xs font-medium">{prog}%</span>
                          </div>
                        </div>
                        <Progress value={prog} className="h-2" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{msTasks.filter(t => t.status === "done").length}/{msTasks.length} tasks</span>
                          {ms.budget ? <span>${Number(ms.actual_cost || 0).toLocaleString()} / ${Number(ms.budget).toLocaleString()}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
              <div className="relative">
                {milestones.length === 0 && <p className="text-sm text-muted-foreground">Add milestones to see the timeline.</p>}
                {milestones.filter(ms => ms.due_date).sort((a, b) => localDate(a.due_date!).getTime() - localDate(b.due_date!).getTime()).map((ms, i, arr) => {
                  const isPast = isPastDue(ms.due_date!);
                  const isCompleted = ms.status === "completed";
                  return (
                    <div key={ms.id} className="flex items-start gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-3 h-3 rounded-full border-2 flex-shrink-0",
                          isCompleted ? "bg-success border-success" : isPast ? "bg-destructive border-destructive" : "bg-background border-primary")} />
                        {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ms.title}</span>
                          <Badge variant="outline" className={cn("text-[10px]", MILESTONE_STATUSES.find(s => s.value === ms.status)?.color)}>
                            {MILESTONE_STATUSES.find(s => s.value === ms.status)?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{localDate(ms.due_date!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="mt-4 space-y-3">
            {milestones.length === 0 && (
              <Card className="p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No milestones yet</h3>
                <p className="text-sm text-muted-foreground mb-3">Break your project into milestones to track progress better.</p>
                <Button onClick={() => { resetMsForm(); setShowNewMilestone(true); }} className="gap-2"><Plus className="w-4 h-4" /> Add Milestone</Button>
              </Card>
            )}
            {milestones.map(ms => {
              const msTasks = filteredTasks.filter(t => t.milestone_id === ms.id);
              const prog = getMilestoneProgress(ms.id);
              const expanded = expandedMilestones.has(ms.id);
              return (
                <Card key={ms.id} className="overflow-hidden">
                  <div className="p-4 cursor-pointer" onClick={() => toggleMilestone(ms.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <Target className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{ms.title}</h3>
                        <Badge variant="outline" className={cn("text-[10px]", MILESTONE_STATUSES.find(s => s.value === ms.status)?.color)}>
                          {MILESTONE_STATUSES.find(s => s.value === ms.status)?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">{prog}%</span>
                        <Progress value={prog} className="w-20 h-2" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><MoreHorizontal className="w-4 h-4 text-muted-foreground cursor-pointer" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditMilestone(ms)}><Edit3 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openNewTask("todo", ms.id)}><Plus className="w-4 h-4 mr-2" /> Add Task</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMilestone(ms.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground ml-10">
                      {ms.due_date && <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{localDate(ms.due_date).toLocaleDateString()}</span>}
                      {Number(ms.budget) > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(ms.actual_cost || 0).toLocaleString()} / ${Number(ms.budget).toLocaleString()}</span>}
                      <span>{msTasks.length} task{msTasks.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t">
                      {msTasks.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">No tasks in this milestone</p>
                          <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => openNewTask("todo", ms.id)}>
                            <Plus className="w-3.5 h-3.5" /> Add Task
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {msTasks.map(task => (
                            <TaskRow key={task.id} task={task} onEdit={() => openEditTask(task)} onDelete={() => deleteTask(task.id)} onStatusChange={moveTask} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Unassigned tasks */}
            {(() => {
              const unassigned = filteredTasks.filter(t => !t.milestone_id);
              if (unassigned.length === 0) return null;
              return (
                <Card className="overflow-hidden">
                  <div className="p-4"><h3 className="font-semibold text-muted-foreground">Unassigned Tasks ({unassigned.length})</h3></div>
                  <div className="border-t divide-y">
                    {unassigned.map(task => (
                      <TaskRow key={task.id} task={task} onEdit={() => openEditTask(task)} onDelete={() => deleteTask(task.id)} onStatusChange={moveTask} />
                    ))}
                  </div>
                </Card>
              );
            })()}
          </TabsContent>

          {/* Board Tab */}
          <TabsContent value="board" className="flex-1 mt-4">
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {TASK_STATUSES.map(col => {
                  const colTasks = filteredTasks.filter(t => t.status === col.id);
                  return (
                    <div key={col.id}
                      className={cn("w-[300px] flex flex-col rounded-xl bg-muted/30 border transition-colors",
                        dragOverColumn === col.id && "border-primary bg-primary/5")}
                      onDragOver={e => handleDragOver(e, col.id)} onDragLeave={handleDragLeave} onDrop={() => handleDrop(col.id)}
                    >
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <col.icon className={cn("w-4 h-4", col.color)} />
                          <span className="text-sm font-semibold text-foreground">{col.label}</span>
                          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{colTasks.length}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNewTask(col.id)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 p-2 pt-0 space-y-2 min-h-[200px]">
                        {colTasks.map(task => (
                          <Card key={task.id} draggable onDragStart={() => handleDragStart(task.id)}
                            className={cn("p-3 cursor-grab hover:shadow-md transition-shadow", draggedTask === task.id && "opacity-50")}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" /></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditTask(task)}><Edit3 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {task.priority && (
                                <Badge className={cn("text-[10px] px-1.5", PRIORITIES.find(p => p.value === task.priority)?.color)}>{task.priority}</Badge>
                              )}
                              {task.labels?.map(l => <Badge key={l} variant="outline" className="text-[10px] px-1.5">{l}</Badge>)}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              {task.assigned_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_name}</span>}
                              {task.due_date && <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{localDate(task.due_date).toLocaleDateString()}</span>}
                              {(Number(task.actual_hours) || Number(task.estimated_hours)) ? (
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.actual_hours || 0}h/{task.estimated_hours || 0}h</span>
                              ) : null}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-4">
            <div className="grid gap-3">
              {members.length === 0 && (
                <Card className="p-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">No team members</h3>
                  <p className="text-sm text-muted-foreground mb-3">Invite members to collaborate on this project.</p>
                  <Button onClick={() => setShowInviteMember(true)} className="gap-2"><UserPlus className="w-4 h-4" /> Invite</Button>
                </Card>
              )}
              {members.map(m => (
                <Card key={m.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {m.profile?.full_name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={m.role} onValueChange={v => updateMemberRole(m.id, v)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["owner", "admin", "member", "viewer"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* No projects */}
      {projects.length === 0 && (
        <Card className="p-12 text-center">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Create your first project</h2>
          <p className="text-muted-foreground mb-4">Organize tasks with milestones, track budgets and time.</p>
          <Button onClick={() => setShowNewProject(true)} className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
        </Card>
      )}

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={v => { setShowNewProject(v); if (!v) resetProjectForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary" onClick={generateProjectDesc} disabled={generatingAI}>
                  {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingAI ? "Generating..." : "AI Generate"}
                </Button>
              </div>
              <Textarea placeholder="Description (optional)" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} className="resize-none" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Deal</p>
              <select value={projectDealId} onChange={e => pickDeal(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm">
                <option value="">— Not linked to a deal —</option>
                {deals.filter(d => d.id === projectDealId || !projects.some(p => p.deal_id === d.id && p.id !== editingProject?.id)).map(d => (
                  <option key={d.id} value={d.id}>{d.title}{d.company_name ? ` · ${d.company_name}` : ""} · ${(d.value || 0).toLocaleString()}{d.stage ? ` · ${d.stage}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <select value={projectContactId} onChange={e => setProjectContactId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm">
                <option value="">— Select a contact —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Technologies (comma-separated)</p>
              <Input placeholder="e.g. React, Node.js, PostgreSQL" value={projectTechs} onChange={e => setProjectTechs(e.target.value)} />
              {projectTechs && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {projectTechs.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <Input placeholder="Total budget ($)" type="number" value={projectBudget} onChange={e => setProjectBudget(e.target.value)} />
            <div><p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2">{PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setProjectColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-transform", projectColor === c && "ring-2 ring-offset-2 ring-primary scale-110")}
                  style={{ backgroundColor: c }} />
              ))}</div>
            </div>
            <Button onClick={createProject} className="w-full" disabled={!projectName.trim()}>Create Project</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditProject} onOpenChange={v => { setShowEditProject(v); if (!v) { setEditingProject(null); resetProjectForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary" onClick={generateProjectDesc} disabled={generatingAI}>
                  {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingAI ? "Generating..." : "AI Generate"}
                </Button>
              </div>
              <Textarea placeholder="Description" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} className="resize-none" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Deal</p>
              <select value={projectDealId} onChange={e => pickDeal(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm">
                <option value="">— Not linked to a deal —</option>
                {deals.filter(d => d.id === projectDealId || !projects.some(p => p.deal_id === d.id && p.id !== editingProject?.id)).map(d => (
                  <option key={d.id} value={d.id}>{d.title}{d.company_name ? ` · ${d.company_name}` : ""} · ${(d.value || 0).toLocaleString()}{d.stage ? ` · ${d.stage}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <select value={projectContactId} onChange={e => setProjectContactId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm">
                <option value="">— Select a contact —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Technologies (comma-separated)</p>
              <Input placeholder="e.g. React, Node.js, PostgreSQL" value={projectTechs} onChange={e => setProjectTechs(e.target.value)} />
              {projectTechs && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {projectTechs.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <Input placeholder="Total budget ($)" type="number" value={projectBudget} onChange={e => setProjectBudget(e.target.value)} />
            <div><p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2">{PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setProjectColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-transform", projectColor === c && "ring-2 ring-offset-2 ring-primary scale-110")}
                  style={{ backgroundColor: c }} />
              ))}</div>
            </div>
            <Button onClick={updateProject} className="w-full" disabled={!projectName.trim()}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New/Edit Milestone Dialog */}
      <Dialog open={showNewMilestone} onOpenChange={v => { if (!v) resetMsForm(); else setShowNewMilestone(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMilestone ? "Edit Milestone" : "New Milestone"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Milestone title" value={msTitle} onChange={e => setMsTitle(e.target.value)} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary" onClick={generateMilestoneDesc} disabled={generatingAI}>
                  {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingAI ? "Generating..." : "AI Generate"}
                </Button>
              </div>
              <Textarea placeholder="Description (optional)" value={msDesc} onChange={e => setMsDesc(e.target.value)} rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Input type="date" value={msDueDate} onChange={e => setMsDueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Budget ($)</label>
                <Input type="number" value={msBudget} onChange={e => setMsBudget(e.target.value)} placeholder="0" />
              </div>
            </div>
            <Select value={msStatus} onValueChange={setMsStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MILESTONE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={createOrUpdateMilestone} className="w-full" disabled={!msTitle.trim()}>
              {editingMilestone ? "Update" : "Create"} Milestone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New/Edit Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={v => { if (!v) resetTaskForm(); else setShowNewTask(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
            <Textarea placeholder="Description" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={taskMilestoneId} onValueChange={setTaskMilestoneId}>
                <SelectTrigger><SelectValue placeholder="Milestone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No milestone</SelectItem>
                  {milestones.map(ms => <SelectItem key={ms.id} value={ms.id}>{ms.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Due Date</label>
                <Input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Assigned To</label>
                <Input list="task-assignees" value={taskAssignedName} onChange={e => setTaskAssignedName(e.target.value)} placeholder="Team member or any name" />
                <datalist id="task-assignees">
                  {teamMembers.map(m => <option key={m.user_id} value={m.full_name || m.email}>{m.full_name ? m.email : "Team member"}</option>)}
                </datalist></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Estimated Hours</label>
                <Input type="number" value={taskEstHours} onChange={e => setTaskEstHours(e.target.value)} placeholder="0" /></div>
              <div><label className="text-xs text-muted-foreground">Actual Hours</label>
                <Input type="number" value={taskActHours} onChange={e => setTaskActHours(e.target.value)} placeholder="0" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Labels (comma-separated)</label>
              <Input value={taskLabels} onChange={e => setTaskLabels(e.target.value)} placeholder="design, frontend" /></div>
            <Button onClick={createOrUpdateTask} className="w-full" disabled={!taskTitle.trim()}>
              {editingTask ? "Update" : "Create"} Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["admin", "member", "viewer"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={inviteMember} className="w-full" disabled={!inviteEmail.trim()}>Add Member</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper components
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </Card>
  );
}

function TaskRow({ task, onEdit, onDelete, onStatusChange }: { task: Task; onEdit: () => void; onDelete: () => void; onStatusChange: (id: string, s: string) => void }) {
  const statusInfo = TASK_STATUSES.find(s => s.id === task.status);
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
      <Select value={task.status} onValueChange={v => onStatusChange(task.id, v)}>
        <SelectTrigger className="w-auto h-auto border-0 p-0 shadow-none">
          {statusInfo && <statusInfo.icon className={cn("w-4 h-4", statusInfo.color)} />}
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.priority && <Badge className={cn("text-[10px] px-1", PRIORITIES.find(p => p.value === task.priority)?.color)}>{task.priority}</Badge>}
          {task.assigned_name && <span className="text-[10px] text-muted-foreground">{task.assigned_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(Number(task.actual_hours) || Number(task.estimated_hours)) ? (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.actual_hours || 0}h/{task.estimated_hours || 0}h</span>
        ) : null}
        {task.due_date && <span>{localDate(task.due_date).toLocaleDateString()}</span>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><MoreHorizontal className="w-4 h-4 text-muted-foreground cursor-pointer" /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}><Edit3 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default Projects;
