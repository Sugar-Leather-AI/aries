import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Calendar, FileText, Share2,
  Linkedin, Twitter, Facebook, Instagram, Globe,
  Check, X, Copy, ChevronLeft, ChevronRight,
  RefreshCw, Eye, Settings2, ChevronDown,
  Pencil, Save, RotateCcw, Send, ExternalLink, Link2, Unlink
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExecutiveAssistantAvatar from "@/components/icons/ExecutiveAssistantAvatar";
import { cn } from "@/lib/utils";
import { SocialAccountsDialog, PublishPostDialog, syncAutoPost, loadSocialAccounts as fetchSocialAccounts, type SocialAccount } from "@/components/social/SocialDialogs";
import { format, startOfWeek, addWeeks, addDays, isMonday } from "date-fns";

interface ContentItem {
  id: string;
  content_date: string;
  day_of_week: string;
  content_type: string;
  platform: string;
  title: string;
  body: string;
  hashtags: string[];
  status: string;
  published_at: string | null;
  published_url: string | null;
  metadata?: {
    scheduled_for?: string; publish_error?: string; social_account?: { name?: string | null };
    format?: string; hook_options?: string[]; image_url?: string; theme?: string;
  } | null;
}

const PLATFORM_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string; bg: string }> = {
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-blue-600", bg: "bg-blue-500/10" },
  twitter: { icon: Twitter, label: "Twitter/X", color: "text-sky-500", bg: "bg-sky-500/10" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-700", bg: "bg-blue-700/10" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-ember-600", bg: "bg-ember-500/10" },
  blog: { icon: Globe, label: "Blog Article", color: "text-emerald-600", bg: "bg-emerald-500/10" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  published: { label: "Published", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface ContentSettings {
  tone: string;
  writing_style: string;
  target_audience: string;
  topics_focus: string;
  topics_avoid: string;
  custom_instructions: string;
  include_hashtags: boolean;
  article_length: string;
  platforms: string[];
}

const DEFAULT_SETTINGS: ContentSettings = {
  tone: "professional",
  writing_style: "conversational",
  target_audience: "",
  topics_focus: "",
  topics_avoid: "",
  custom_instructions: "",
  include_hashtags: true,
  article_length: "400-600",
  platforms: ["linkedin", "twitter", "facebook", "instagram"],
};

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "witty", label: "Witty" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
];

const STYLE_OPTIONS = [
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
  { value: "bold", label: "Bold & Opinionated" },
  { value: "minimalist", label: "Minimalist" },
  { value: "thoughtful", label: "Thoughtful & Reflective" },
];

const ARTICLE_LENGTH_OPTIONS = [
  { value: "200-400", label: "Short (200-400 words)" },
  { value: "400-600", label: "Medium (400-600 words)" },
  { value: "600-900", label: "Long (600-900 words)" },
];

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "twitter", label: "Twitter/X", icon: Twitter },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
];

function getWeekStart(date: Date): Date {
  const d = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return d;
}

const ExecutiveAssistant = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<number | null>(null);
  const [imageBusy, setImageBusy] = useState<string | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<ContentItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "article" | "social_post">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [showSocial, setShowSocial] = useState(false);
  const [publishItem, setPublishItem] = useState<ContentItem | null>(null);
  const [settings, setSettings] = useState<ContentSettings>(() => {
    const saved = localStorage.getItem("executive_assistant_settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const saveSettings = (updates: Partial<ContentSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    localStorage.setItem("executive_assistant_settings", JSON.stringify(updated));
  };

  const togglePlatform = (platform: string) => {
    const current = settings.platforms;
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    if (updated.length === 0) return; // must have at least one
    saveSettings({ platforms: updated });
  };

  const currentWeekStart = addWeeks(getWeekStart(new Date()), weekOffset);
  const weekDates = DAYS.map((day, i) => ({
    day,
    date: format(addDays(currentWeekStart, i), "yyyy-MM-dd"),
    display: format(addDays(currentWeekStart, i), "MMM d"),
  }));

  const weekLabel = `${format(currentWeekStart, "MMM d")} – ${format(addDays(currentWeekStart, 4), "MMM d, yyyy")}`;

  useEffect(() => {
    if (user?.clientId) {
      loadContent();
      loadSocialAccounts();
    }
  }, [user?.clientId, weekOffset]);

  // Back from connecting an account on Zernio's page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("social")) {
      toast.success("Social account connected");
      window.history.replaceState({}, "", window.location.pathname);
      loadSocialAccounts();
    }
  }, []);

  const loadSocialAccounts = async () => {
    if (!user?.clientId) return;
    try {
      setSocialAccounts(await fetchSocialAccounts(user.clientId));
    } catch (err: any) {
      console.error("Failed to load social accounts:", err.message);
    }
  };

  const accountFor = (platform: string) => socialAccounts.find(a => a.platform === platform && a.active);

  const loadContent = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("executive_content" as any) as any)
      .select("*")
      .eq("client_id", user!.clientId!)
      .gte("content_date", weekDates[0].date)
      .lte("content_date", weekDates[4].date)
      .order("content_date")
      .order("content_type", { ascending: false }); // articles first

    if (error) {
      console.error("Failed to load content:", error);
      toast.error("Failed to load content");
    }
    setContent((data as unknown as ContentItem[]) || []);
    setLoading(false);
  };

  // Starts the background run, then polls until all five days are written.
  const generateWeek = async () => {
    setGenerating(true);
    setGenProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { client_id: user!.clientId, week_start: weekDates[0].date, settings },
      });
      const message = data?.error || (error ? (await (error as any).context?.json?.().catch(() => null))?.error || error.message : null);
      if (message) throw new Error(message);
      const jobId = data.job_id;
      const startedAt = Date.now();
      let lastDone = -1;
      while (Date.now() - startedAt < 8 * 60_000) {
        await new Promise(r => setTimeout(r, 4000));
        const { data: job } = await (supabase.from as any)("content_jobs").select("status, days_done, error").eq("id", jobId).single();
        if (!job) continue;
        if (job.days_done !== lastDone) { lastDone = job.days_done; setGenProgress(job.days_done); await loadContent(); }
        if (job.status === "done") { toast.success("Your week of content is ready to review"); await loadContent(); return; }
        if (job.status === "failed") throw new Error(job.error || "Generation failed");
      }
      toast.message("Still writing. Check back in a minute.");
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate content");
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  };

  // Let the server schedule or cancel auto-posts after a change, then show the result.
  const resync = () => {
    if (!user?.clientId || !socialAccounts.length) return;
    syncAutoPost(user.clientId).then(() => loadContent());
  };

  const newImage = async (item: ContentItem) => {
    setImageBusy(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-content", {
        body: { content_id: item.id, client_id: user!.clientId, image_only: true },
      });
      const message = data?.error || (error ? (await (error as any).context?.json?.().catch(() => null))?.error || error.message : null);
      if (message) throw new Error(message);
      setContent(prev => prev.map(c => c.id === item.id ? { ...c, metadata: data.item.metadata } : c));
      toast.success("New image ready");
    } catch (err: any) {
      toast.error(err.message || "Couldn't create an image");
    } finally {
      setImageBusy(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("executive_content" as any) as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    setContent(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    toast.success(`Content ${status}`);
    resync();
  };

  const copyToClipboard = (text: string, hashtags: string[]) => {
    const full = hashtags.length > 0 ? `${text}\n\n${hashtags.map(h => `#${h}`).join(" ")}` : text;
    navigator.clipboard.writeText(full);
    toast.success("Copied to clipboard");
  };

  const startEditing = (item: ContentItem) => {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditBody(item.body);
    setEditHashtags(item.hashtags.join(", "));
    setExpandedItem(item.id);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditTitle("");
    setEditBody("");
    setEditHashtags("");
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const hashtags = editHashtags.split(",").map(h => h.trim().replace(/^#/, "")).filter(Boolean);
    const { error } = await (supabase.from("executive_content" as any) as any)
      .update({
        title: editTitle,
        body: editBody,
        hashtags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      setContent(prev => prev.map(c => c.id === id ? { ...c, title: editTitle, body: editBody, hashtags } : c));
      toast.success("Content updated");
      resync();
      cancelEditing();
    }
    setSavingEdit(false);
  };

  const regenerateItem = async (item: ContentItem, feedback?: string) => {
    setRegeneratingId(item.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            content_id: item.id,
            client_id: user!.clientId,
            settings,
            feedback: feedback || undefined,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Regeneration failed");

      const updated = result.content;
      setContent(prev => prev.map(c => c.id === item.id ? {
        ...c,
        title: updated.title,
        body: updated.body,
        hashtags: updated.hashtags || [],
        status: "draft",
        metadata: updated.metadata,
      } : c));
      toast.success("Content regenerated");
      resync();
    } catch (err: any) {
      console.error("Regeneration error:", err);
      toast.error(err.message || "Failed to regenerate");
    } finally {
      setRegeneratingId(null);
    }
  };

  const dayContent = content.filter(c => c.day_of_week === selectedDay);
  const filteredContent = filter === "all" ? dayContent : dayContent.filter(c => c.content_type === filter);

  const dayStats = DAYS.map(day => {
    const items = content.filter(c => c.day_of_week === day);
    const approved = items.filter(c => c.status === "approved").length;
    const total = items.length;
    return { day, total, approved };
  });

  const totalItems = content.length;
  const approvedItems = content.filter(c => c.status === "approved").length;
  const publishedItems = content.filter(c => c.status === "published").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ExecutiveAssistantAvatar size={28} />
            Executive Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated articles and social media posts — ready to review and publish
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowSocial(true)} className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            {socialAccounts.length ? `Social accounts (${socialAccounts.length})` : "Connect social accounts"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Settings
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSettings && "rotate-180")} />
          </Button>
          <Button
            onClick={generateWeek}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {genProgress ? `Writing... ${genProgress}/5 days` : "Planning the week..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate This Week
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  Content Generation Settings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => { saveSettings(DEFAULT_SETTINGS); toast.success("Settings reset to defaults"); }}
                >
                  Reset to Defaults
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tone */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tone</Label>
                  <Select value={settings.tone} onValueChange={(v) => saveSettings({ tone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Writing Style */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Writing Style</Label>
                  <Select value={settings.writing_style} onValueChange={(v) => saveSettings({ writing_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Article Length */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Article Length</Label>
                  <Select value={settings.article_length} onValueChange={(v) => saveSettings({ article_length: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ARTICLE_LENGTH_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Audience */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Audience</Label>
                  <Input
                    placeholder="e.g. Small business owners, tech professionals, local community..."
                    value={settings.target_audience}
                    onChange={(e) => saveSettings({ target_audience: e.target.value })}
                  />
                </div>

                {/* Topics to Focus On */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Topics to Focus On</Label>
                  <Input
                    placeholder="e.g. customer success stories, industry trends, behind the scenes..."
                    value={settings.topics_focus}
                    onChange={(e) => saveSettings({ topics_focus: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Topics to Avoid */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Topics to Avoid</Label>
                  <Input
                    placeholder="e.g. politics, competitor mentions, pricing details..."
                    value={settings.topics_avoid}
                    onChange={(e) => saveSettings({ topics_avoid: e.target.value })}
                  />
                </div>

                {/* Include Hashtags */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs">Include Hashtags</Label>
                  <Switch
                    checked={settings.include_hashtags}
                    onCheckedChange={(v) => saveSettings({ include_hashtags: v })}
                  />
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-1.5">
                <Label className="text-xs">Platforms to Generate For</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = settings.platforms.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => togglePlatform(value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <Label className="text-xs">Custom Instructions</Label>
                <Textarea
                  placeholder="Any additional guidelines for the AI writer... e.g. 'Always mention our free consultation offer' or 'Write as if speaking to a local audience in Austin, TX'"
                  value={settings.custom_instructions}
                  onChange={(e) => saveSettings({ custom_instructions: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{weekLabel}</p>
          {totalItems > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItems} items · {approvedItems} approved · {publishedItems} published
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {content.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 rounded-xl border bg-card"
        >
          <ExecutiveAssistantAvatar size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No content for this week</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Click "Generate This Week" to have your AI Executive Assistant create a full week of
            articles and social media posts tailored to your business.
          </p>
          <Button onClick={generateWeek} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Content"}
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Day Tabs */}
          <div className="grid grid-cols-5 gap-2">
            {weekDates.map(({ day, display }, i) => {
              const stats = dayStats[i];
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <p className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {day}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{display}</p>
                  {stats.total > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{stats.total}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({dayContent.length})
            </Button>
            <Button
              variant={filter === "article" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("article")}
              className="gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              Articles ({dayContent.filter(c => c.content_type === "article").length})
            </Button>
            <Button
              variant={filter === "social_post" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("social_post")}
              className="gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              Social ({dayContent.filter(c => c.content_type === "social_post").length})
            </Button>
          </div>

          {/* Content Cards */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredContent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No {filter === "all" ? "" : filter === "article" ? "article" : "social"} content for {selectedDay}
                </p>
              ) : (
                filteredContent.map((item, idx) => {
                  const platform = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.blog;
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                  const PlatformIcon = platform.icon;
                  const isExpanded = expandedItem === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ delay: idx * 0.04 }}
                      className="rounded-xl border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      {/* Card Header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      >
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", platform.bg)}>
                          <PlatformIcon className={cn("w-5 h-5", platform.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-muted-foreground">{platform.label}</span>
                            {item.metadata?.format && item.metadata.format !== "article" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{item.metadata.format.replace(/_/g, " ")}</span>
                            )}
                            <Badge variant={statusCfg.variant} className="text-[10px] h-5">
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Regenerate single item */}
                          {item.status !== "published" && <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            disabled={regeneratingId === item.id}
                            onClick={(e) => { e.stopPropagation(); setFeedbackFor(item); }}
                            title="Rewrite with AI"
                          >
                            {regeneratingId === item.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RotateCcw className="w-3.5 h-3.5" />}
                          </Button>}
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); editingItem === item.id ? cancelEditing() : startEditing(item); }}
                            title={editingItem === item.id ? "Cancel editing" : "Edit content"}
                          >
                            {editingItem === item.id ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </Button>
                          {/* Copy */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(item.body, item.hashtags); }}
                            title="Copy to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          {item.status === "draft" && editingItem !== item.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={(e) => { e.stopPropagation(); updateStatus(item.id, "approved"); }}
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); updateStatus(item.id, "rejected"); }}
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {item.status === "approved" && (
                            <>
                              {item.metadata?.scheduled_for && (
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap" title={(item.metadata as any).scheduled_by === "auto" ? "Scheduled automatically" : "Scheduled"}>
                                  Goes out {format(new Date(item.metadata.scheduled_for), "EEE h:mm a")}
                                </span>
                              )}
                              {item.metadata?.publish_error && (
                                <span className="text-[11px] text-destructive max-w-[160px] truncate" title={item.metadata.publish_error}>Failed</span>
                              )}
                              {accountFor(item.platform) && !item.metadata?.scheduled_for && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                                  onClick={(e) => { e.stopPropagation(); setPublishItem(item); }}
                                  title={`Publish to ${PLATFORM_CONFIG[item.platform]?.label || item.platform}`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={(e) => { e.stopPropagation(); updateStatus(item.id, "draft"); }}
                                title="Revert to draft"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {item.status === "published" && item.published_url && (
                            <a
                              href={item.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:bg-blue-500/10"
                              title="View post"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Eye className={cn("w-4 h-4 transition-transform", isExpanded ? "rotate-180" : "")} />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t pt-3">
                              {editingItem === item.id ? (
                                /* ── Edit Mode ── */
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Title</Label>
                                    <Input
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Content</Label>
                                    <Textarea
                                      value={editBody}
                                      onChange={(e) => setEditBody(e.target.value)}
                                      rows={item.content_type === "article" ? 12 : 6}
                                      className="text-sm leading-relaxed"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Hashtags (comma-separated)</Label>
                                    <Input
                                      value={editHashtags}
                                      onChange={(e) => setEditHashtags(e.target.value)}
                                      placeholder="tag1, tag2, tag3"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      onClick={() => saveEdit(item.id)}
                                      disabled={savingEdit}
                                      className="gap-1.5"
                                    >
                                      {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Save Changes
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditing}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* ── Read Mode ── */
                                <>
                                  {item.content_type === "social_post" && (
                                    <div className="mb-3 flex items-end gap-2">
                                      {item.metadata?.image_url ? (
                                        <a href={item.metadata.image_url} target="_blank" rel="noopener noreferrer">
                                          <img src={item.metadata.image_url} alt="" className="w-40 h-40 rounded-lg object-cover border" loading="lazy" />
                                        </a>
                                      ) : (
                                        <div className="text-xs text-muted-foreground">No image yet.</div>
                                      )}
                                      {item.status !== "published" && (
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={imageBusy === item.id}
                                          onClick={(e) => { e.stopPropagation(); newImage(item); }}>
                                          {imageBusy === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                          {item.metadata?.image_url ? "New image" : "Create image"}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                  <div className="prose prose-sm max-w-none text-foreground">
                                    {item.body.split("\n\n").map((p, pi) => (
                                      <p key={pi} className="text-sm leading-relaxed text-foreground/90 mb-3">
                                        {p.split("\n").map((line, li) => (
                                          <span key={li}>
                                            {line}
                                            {li < p.split("\n").length - 1 && <br />}
                                          </span>
                                        ))}
                                      </p>
                                    ))}
                                  </div>
                                  {item.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                                      {item.hashtags.map(tag => (
                                        <span key={tag} className="text-xs text-primary font-medium">#{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </>
      )}
      {user?.clientId && (
        <>
          <Dialog open={!!feedbackFor} onOpenChange={(o) => { if (!o) { setFeedbackFor(null); setFeedbackText(""); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Rewrite with feedback</DialogTitle>
                <DialogDescription>Optional: say what to change, like "shorter", "use a customer review", "less salesy" or "funnier hook". Leave it empty for a fresh take.</DialogDescription>
              </DialogHeader>
              <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={3} placeholder="What should be different?" />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setFeedbackFor(null); setFeedbackText(""); }}>Cancel</Button>
                <Button onClick={() => { const it = feedbackFor!; const fb = feedbackText.trim(); setFeedbackFor(null); setFeedbackText(""); regenerateItem(it, fb); }}>
                  <Sparkles className="w-4 h-4 mr-1" />Rewrite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <SocialAccountsDialog open={showSocial} onOpenChange={setShowSocial} clientId={user.clientId}
            accounts={socialAccounts} onChanged={loadSocialAccounts} />
          <PublishPostDialog open={!!publishItem} onOpenChange={(o) => { if (!o) setPublishItem(null); }}
            clientId={user.clientId} item={publishItem} accounts={socialAccounts}
            defaultMediaUrl={publishItem?.metadata?.image_url || ""}
            onDone={(r) => {
              const id = publishItem?.id;
              setContent(prev => prev.map(c => c.id !== id ? c : r.scheduled
                ? { ...c, metadata: { ...(c.metadata || {}), scheduled_for: r.scheduled_for, publish_error: undefined } }
                : { ...c, status: "published", published_at: r.published_at || new Date().toISOString(), published_url: r.published_url || null }));
            }} />
        </>
      )}
    </div>
  );
};

export default ExecutiveAssistant;
