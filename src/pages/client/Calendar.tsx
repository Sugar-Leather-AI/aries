import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Download, ExternalLink, Clock, Send, RefreshCw, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay, parseISO } from "date-fns";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
  confirmed: "bg-success/10 text-success border-l-success",
  scheduled: "bg-primary/10 text-primary border-l-primary",
  completed: "bg-muted text-muted-foreground border-l-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive border-l-destructive",
  "no-show": "bg-warning/10 text-warning border-l-warning",
};

function generateICS(apt: { scheduled_at: string; service?: string | null; notes?: string | null; duration_minutes?: number | null; contact_name?: string; contact_email?: string | null }) {
  const start = new Date(apt.scheduled_at);
  const end = new Date(start.getTime() + (apt.duration_minutes || 30) * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const attendee = apt.contact_email ? `\nATTENDEE;CN=${apt.contact_name || "Guest"}:mailto:${apt.contact_email}` : "";
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lovable CRM//EN
BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:${apt.service || "Appointment"} - ${apt.contact_name || "Client"}
DESCRIPTION:${apt.notes || ""}${attendee}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

function downloadICS(apt: Parameters<typeof generateICS>[0]) {
  const blob = new Blob([generateICS(apt)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appointment-${format(new Date(apt.scheduled_at), "yyyy-MM-dd")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const Calendar = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showCalEmbed, setShowCalEmbed] = useState(false);
  const [calUrl, setCalUrl] = useState("");
  const [calApiKey, setCalApiKey] = useState("");
  const [calSaved, setCalSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newApt, setNewApt] = useState({ date: "", time: "09:00", service: "", notes: "", duration: "30", contact_id: "" });

  // Load saved Cal.com settings from DB
  useEffect(() => {
    if (user?.clientId) {
      supabase.from("clients").select("cal_url, cal_api_key").eq("id", user.clientId).single().then(({ data }) => {
        if (data) {
          if ((data as any).cal_url) { setCalUrl((data as any).cal_url); setCalSaved(true); }
          if ((data as any).cal_api_key) setCalApiKey((data as any).cal_api_key);
        }
      });
    }
  }, [user?.clientId]);

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*, contacts(first_name, last_name, email)");
      if (error) throw error;
      return data.map((a) => ({
        ...a,
        contact_name: a.contacts ? `${a.contacts.first_name} ${a.contacts.last_name}` : "Walk-in",
        contact_email: a.contacts?.email || null,
      }));
    },
  });

  // Fetch contacts for dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name, email");
      if (error) throw error;
      return data;
    },
  });

  // Create appointment
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: clientId } = await supabase.rpc("ensure_user_client_id");
      if (!clientId) throw new Error("No client linked");
      const scheduled_at = new Date(`${newApt.date}T${newApt.time}`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        client_id: clientId,
        scheduled_at,
        service: newApt.service || null,
        notes: newApt.notes || null,
        duration_minutes: parseInt(newApt.duration),
        contact_id: newApt.contact_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowNewDialog(false);
      setNewApt({ date: "", time: "09:00", service: "", notes: "", duration: "30", contact_id: "" });
      toast.success("Appointment created!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Send .ics via email
  const sendIcsMutation = useMutation({
    mutationFn: async (apt: { scheduled_at: string; service?: string | null; notes?: string | null; duration_minutes?: number | null; contact_name?: string; contact_email?: string | null }) => {
      if (!apt.contact_email) throw new Error("No email address for this contact");
      const icsContent = generateICS(apt);
      const { data, error } = await supabase.functions.invoke("send-ics-email", {
        body: { to: apt.contact_email, contact_name: apt.contact_name, service: apt.service, scheduled_at: apt.scheduled_at, ics_content: icsContent },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => toast.success("Calendar invite sent!"),
    onError: (e) => toast.error(e.message),
  });

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...allDays];
  while (cells.length % 7 !== 0) cells.push(null);

  // Group appointments by day
  const aptsByDay = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    appointments.forEach((a) => {
      const key = format(parseISO(a.scheduled_at), "yyyy-MM-dd");
      (map[key] ??= []).push(a);
    });
    return map;
  }, [appointments]);

  // Stats
  const now = new Date();

  // This week (Sun–Sat)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // This month
  const monthStartDate = startOfMonth(now);
  const monthEndDate = endOfMonth(now);

  const thisWeek = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d >= weekStart && d < weekEnd;
  });

  const thisMonth = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d >= monthStartDate && d <= monthEndDate;
  });

  // Upcoming (future, non-cancelled)
  const upcoming = appointments.filter((a) => {
    return new Date(a.scheduled_at) > now && a.status !== "cancelled";
  });

  // Completed (all time)
  const completed = appointments.filter((a) => a.status === "completed");

  // Completion rate (completed / (completed + no-show), excludes scheduled/cancelled)
  const concluded = appointments.filter((a) => a.status === "completed" || a.status === "no-show");
  const completionRate = concluded.length ? Math.round((completed.length / concluded.length) * 100) : 100;

  // No-shows (all time)
  const noShows = appointments.filter((a) => a.status === "no-show").length;

  // Show rate this week
  const showRate = thisWeek.length ? Math.round((thisWeek.filter((a) => a.status !== "no-show" && a.status !== "cancelled").length / thisWeek.length) * 100) : 100;

  // Last month for comparison
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const lastMonth = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });
  const monthTrend = thisMonth.length > lastMonth.length ? "up" : thisMonth.length < lastMonth.length ? "down" : "stable";

  const selectedDayApts = selectedDay ? aptsByDay[format(selectedDay, "yyyy-MM-dd")] || [] : [];

  // Parse cal.com URL to get embed URL
  const getCalEmbedUrl = (url: string) => {
    if (!url) return "";
    let cleaned = url.trim();
    // Handle "cal.com/username" or "https://cal.com/username/event-type"
    if (!cleaned.startsWith("http")) cleaned = `https://${cleaned}`;
    try {
      const parsed = new URL(cleaned);
      if (parsed.hostname.includes("cal.com")) {
        return `${cleaned}?embed=true&layout=month_view&hideBranding=true`;
      }
    } catch { /* invalid URL */ }
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-foreground">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="sm" onClick={() => setShowCalEmbed(true)}>
            <ExternalLink className="w-4 h-4 mr-1" />Public Booking
          </Button>
          <Button size="sm" onClick={() => { setShowNewDialog(true); setNewApt((p) => ({ ...p, date: format(selectedDay || new Date(), "yyyy-MM-dd") })); }}>
            <Plus className="w-4 h-4 mr-1" />New Appointment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming"
          value={String(upcoming.length)}
          change={upcoming.length === 1 ? "appointment" : "appointments"}
          trend="stable"
          index={0}
        />
        <StatCard
          title="This Month"
          value={String(thisMonth.length)}
          change={lastMonth.length > 0 ? `vs ${lastMonth.length} last month` : "bookings"}
          trend={monthTrend}
          index={1}
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          change={`${completed.length} completed · ${noShows} no-show${noShows !== 1 ? "s" : ""}`}
          trend={completionRate >= 80 ? "up" : "down"}
          index={2}
          tint={completionRate >= 80 ? "success" : undefined}
        />
        <StatCard
          title="Total Booked"
          value={String(appointments.length)}
          change={`${thisWeek.length} this week · ${showRate}% show rate`}
          trend="stable"
          index={3}
        />
      </div>

      {/* Calendar grid + day detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card p-0 overflow-hidden lg:col-span-2">
          <div className="grid grid-cols-7">
            {daysOfWeek.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/30">{d}</div>
            ))}
            {cells.map((day, i) => {
              const key = day ? format(day, "yyyy-MM-dd") : "";
              const dayApts = key ? aptsByDay[key] || [] : [];
              const selected = day && selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day)}
                  className={cn(
                    "min-h-[90px] p-1.5 border-b border-r text-xs cursor-pointer transition-colors",
                    day && isToday(day) ? "bg-primary/5" : day ? "bg-card hover:bg-accent/30" : "bg-muted/20",
                    selected && "ring-2 ring-primary ring-inset",
                    !day && "pointer-events-none"
                  )}
                >
                  {day && (
                    <>
                      <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs",
                        isToday(day) ? "bg-primary text-primary-foreground font-bold" : "text-foreground")}>{format(day, "d")}</span>
                      <div className="space-y-0.5 mt-1">
                        {dayApts.slice(0, 3).map((apt, j) => (
                          <div key={j} className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border-l-2 truncate", statusColors[apt.status || "scheduled"])}>
                            {format(parseISO(apt.scheduled_at), "h:mma")} {apt.contact_name}
                          </div>
                        ))}
                        {dayApts.length > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{dayApts.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Day detail sidebar */}
        <div className="stat-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Select a day"}
          </h3>
          {selectedDay && selectedDayApts.length === 0 && (
            <p className="text-xs text-muted-foreground">No appointments</p>
          )}
          {selectedDayApts.map((apt) => (
            <div key={apt.id} className={cn("p-3 rounded-lg border-l-4 space-y-1", statusColors[apt.status || "scheduled"])}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{apt.contact_name}</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-card">{apt.status}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(apt.scheduled_at), "h:mm a")}</span>
                <span>{apt.duration_minutes}min</span>
                {apt.service && <span>· {apt.service}</span>}
              </div>
              {apt.notes && <p className="text-xs text-muted-foreground">{apt.notes}</p>}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => downloadICS(apt)}>
                  <Download className="w-3 h-3 mr-1" />Download .ics
                </Button>
                {apt.contact_email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    disabled={sendIcsMutation.isPending}
                    onClick={() => sendIcsMutation.mutate(apt)}
                  >
                    <Send className="w-3 h-3 mr-1" />{sendIcsMutation.isPending ? "Sending..." : "Email Invite"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={newApt.date} onChange={(e) => setNewApt((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time</Label>
                <Input type="time" value={newApt.time} onChange={(e) => setNewApt((p) => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact</Label>
              <Select value={newApt.contact_id} onValueChange={(v) => setNewApt((p) => ({ ...p, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a contact or leave empty for walk-in" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in (no contact)</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Service</Label>
                <Input placeholder="e.g. Consultation" value={newApt.service} onChange={(e) => setNewApt((p) => ({ ...p, service: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Select value={newApt.duration} onValueChange={(v) => setNewApt((p) => ({ ...p, duration: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["15", "30", "45", "60", "90"].map((m) => <SelectItem key={m} value={m}>{m} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={newApt.notes} onChange={(e) => setNewApt((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newApt.date || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cal.com Public Booking Embed Dialog */}
      <Dialog open={showCalEmbed} onOpenChange={setShowCalEmbed}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Public Booking Page</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Cal.com account to enable a public booking link your clients can use to self-schedule appointments.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Your Cal.com Username or Embed URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. https://cal.com/your-username/consultation"
                  value={calUrl}
                  onChange={(e) => { setCalUrl(e.target.value); setCalSaved(false); }}
                  disabled={calSaved}
                />
                {calSaved ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-md whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      Connected
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setCalSaved(false); }}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={async () => {
                    if (getCalEmbedUrl(calUrl)) {
                      // Save Cal.com URL to database
                      if (user?.clientId) {
                        await supabase.from("clients").update({ cal_url: calUrl.trim() } as any).eq("id", user.clientId);
                      }
                      setCalSaved(true);
                      toast.success("Cal.com booking page connected!");
                    } else {
                      toast.error("Please enter a valid Cal.com URL (e.g. cal.com/username)");
                    }
                  }}>
                    Connect
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Don't have Cal.com? <a href="https://cal.com/signup" target="_blank" rel="noopener" className="text-primary underline">Sign up free</a> — it's open source.
              </p>
            </div>

            {/* API Key + Sync */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Sync Bookings from Cal.com</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your Cal.com API key to automatically pull bookings into your calendar. Find it at{" "}
                <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener" className="text-primary underline">Cal.com Settings &gt; API Keys</a>.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="cal_live_..."
                  value={calApiKey}
                  onChange={(e) => setCalApiKey(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!calApiKey.trim()}
                  onClick={async () => {
                    if (user?.clientId && calApiKey.trim()) {
                      await supabase.from("clients").update({ cal_api_key: calApiKey.trim() } as any).eq("id", user.clientId);
                      toast.success("API key saved!");
                    }
                  }}
                >
                  Save Key
                </Button>
              </div>
              <Button
                className="w-full"
                disabled={!calApiKey.trim() || syncing}
                onClick={async () => {
                  if (!user?.clientId || !calApiKey.trim()) return;
                  setSyncing(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("sync-cal-bookings", {
                      body: { client_id: user.clientId, cal_api_key: calApiKey.trim() },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    queryClient.invalidateQueries({ queryKey: ["appointments"] });
                    toast.success(`Synced ${data.synced} new bookings! (${data.skipped} already existed)`);
                  } catch (e: any) {
                    toast.error(e.message || "Sync failed");
                  } finally {
                    setSyncing(false);
                  }
                }}
              >
                {syncing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Syncing...</> : <><RefreshCw className="w-4 h-4 mr-1" />Sync Bookings Now</>}
              </Button>
            </div>

            {calSaved && getCalEmbedUrl(calUrl) && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-success/5 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Your Cal.com booking page is live</p>
                  <p className="text-[11px] text-muted-foreground">Clients can now self-schedule appointments through this embed. Use the Sync button above to pull new bookings into your calendar.</p>
                  <a href={calUrl.startsWith("http") ? calUrl : `https://${calUrl}`} target="_blank" rel="noopener" className="text-[11px] text-primary underline inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />Open booking page in new tab
                  </a>
                </div>
                <div className="rounded-lg border overflow-hidden" style={{ height: 420 }}>
                  <iframe
                    src={getCalEmbedUrl(calUrl)}
                    className="w-full h-full border-0"
                    title="Cal.com Booking"
                    allow="camera; microphone"
                  />
                </div>
              </div>
            )}
            {!calSaved && (
              <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <ExternalLink className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Enter your Cal.com URL above and click Connect to load your booking page</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
