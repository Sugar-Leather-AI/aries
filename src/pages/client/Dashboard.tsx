import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Users, CalendarDays, DollarSign, Star, TrendingUp,
  ArrowRight, Loader2, Zap, Mail, Target,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessStats, type Insight } from "@/hooks/useBusinessStats";


function getMonthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activities, loading: activitiesLoading } = useActivityFeed(15);
  const { stats, loading: statsLoading, contactChange, appointmentChange, winRate, insights: baseInsights } = useBusinessStats(user?.clientId);
  const [leadChart, setLeadChart] = useState<{ day: string; leads: number }[]>([]);
  const [dealChart, setDealChart] = useState<{ stage: string; value: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.clientId) {
      loadDashboard();
    } else if (user) {
      setLoading(false);
    }
  }, [user?.clientId, user]);

  const loadDashboard = async () => {
    const clientId = user!.clientId!;
    const thisMonth = getMonthRange(0);

    // Headline numbers and insights come from useBusinessStats; this loads the charts.
    const { data: dealRows } = await supabase.from("deals").select("value, stage").eq("client_id", clientId);
    const deals = dealRows || [];

    // Lead chart: contacts created per day this month
    const { data: contactsByDay } = await supabase
      .from("contacts")
      .select("created_at")
      .eq("client_id", clientId)
      .gte("created_at", thisMonth.start)
      .lte("created_at", thisMonth.end)
      .order("created_at");

    const dayMap: Record<number, number> = {};
    const today = new Date().getDate();
    for (let i = 1; i <= today; i++) dayMap[i] = 0;
    (contactsByDay || []).forEach((c: any) => {
      const day = new Date(c.created_at).getDate();
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    setLeadChart(Object.entries(dayMap).map(([day, leads]) => ({ day, leads })));

    // Deal pipeline chart by stage
    const stageOrder = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won"];
    const stageMap: Record<string, { value: number; count: number }> = {};
    stageOrder.forEach(s => { stageMap[s] = { value: 0, count: 0 }; });
    deals.forEach((d: any) => {
      const stage = d.stage || "New Lead";
      if (stageMap[stage]) {
        stageMap[stage].value += d.value || 0;
        stageMap[stage].count += 1;
      }
    });
    setDealChart(stageOrder.map(stage => ({ stage, value: stageMap[stage].value, count: stageMap[stage].count })));

    setLoading(false);
  };

  const statCards = stats ? [
    {
      label: "Total Contacts",
      value: stats.totalContacts.toLocaleString(),
      sub: `${stats.contactsThisMonth} new this month`,
      change: contactChange,
      changeLabel: undefined as string | undefined,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pipeline Value",
      value: `$${stats.pipelineValue.toLocaleString()}`,
      sub: `${stats.totalDeals} active deals`,
      change: winRate,
      changeLabel: `${winRate}% win rate`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Appointments",
      value: String(stats.appointmentsThisMonth),
      sub: `${stats.appointmentsLastMonth} last month`,
      change: appointmentChange,
      changeLabel: undefined as string | undefined,
      icon: CalendarDays,
      color: "text-ember-600",
      bg: "bg-ember-500/10",
    },
    {
      label: "Revenue Won",
      value: `$${stats.wonDealsValue.toLocaleString()}`,
      sub: `${stats.wonDealsCount} deals closed`,
      change: null as number | null,
      changeLabel: undefined as string | undefined,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
  ] : [];

  const quickActions = [
    { icon: Mail, label: "Go to Inbox", action: () => navigate("/inbox"), badge: stats?.unreadMessages },
    { icon: Users, label: "View Contacts", action: () => navigate("/contacts"), badge: undefined as number | undefined },
    { icon: CalendarDays, label: "View Calendar", action: () => navigate("/calendar"), badge: undefined as number | undefined },
    { icon: Target, label: "Manage Pipeline", action: () => navigate("/pipeline"), badge: undefined as number | undefined },
    { icon: Star, label: "Check Reviews", action: () => navigate("/reputation"), badge: undefined as number | undefined },
  ];

  // Data-driven insights (shared with other brands' home screens), in the Aries colours.
  const INSIGHT_COLORS: Record<Insight["kind"], string> = {
    inbox: "border-l-blue-500 bg-blue-500/5",
    warning: "border-l-warning bg-warning/5",
    success: "border-l-success bg-success/5",
    pipeline: "border-l-amber-500 bg-amber-500/5",
    reviews: "border-l-emerald-500 bg-emerald-500/5",
    info: "border-l-info bg-info/5",
    welcome: "border-l-primary bg-primary/5",
  };
  const insights = baseInsights.map((i) => ({ ...i, color: INSIGHT_COLORS[i.kind], action: () => navigate(i.to) }));

  if (loading || (statsLoading && !!user?.clientId)) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", card.bg)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
            </div>
            {card.change !== null && (
              <div className="flex items-center gap-1 mt-2">
                {card.change > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                ) : card.change < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className={cn("text-xs font-medium",
                  card.change > 0 ? "text-success" : card.change < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {card.changeLabel || `${card.change > 0 ? "+" : ""}${card.change}% vs last month`}
                </span>
              </div>
            )}
            <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.05]", card.bg.replace("/10", "/100"))} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions / AI Insights / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map(a => (
              <Button key={a.label} variant="outline" className="w-full justify-start gap-2 h-10 text-sm" onClick={a.action}>
                <a.icon className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">{a.label}</span>
                {a.badge && a.badge > 0 ? (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-medium px-1.5">
                    {a.badge > 99 ? "99+" : a.badge}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>

          {/* Mini stats */}
          {stats && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.messagesInbound + stats.messagesOutbound}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Messages</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">${stats.invoicesPaid.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Invoices Paid</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">AI Insights</h3>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 4).map((ins, idx) => (
              <div key={idx} className={`rounded-lg border-l-[3px] p-3 ${ins.color}`}>
                <p className="text-sm font-medium text-foreground">{ins.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.desc}</p>
                <button
                  onClick={ins.action}
                  className="text-xs text-primary font-medium mt-2 flex items-center gap-1 hover:underline"
                >
                  {ins.cta} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No activity yet. Actions like creating contacts, deals, and appointments will appear here.
                </p>
              ) : (
                activities.map(a => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <span className="text-base flex-shrink-0">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-foreground leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">New Contacts This Month</h3>
            <span className="text-xs text-muted-foreground">{stats?.contactsThisMonth || 0} total</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadChart}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`${value} leads`, "New Contacts"]}
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Pipeline by Stage</h3>
            <span className="text-xs text-muted-foreground">${stats?.pipelineValue.toLocaleString() || 0} total</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => {
                    if (name === "value") return [`$${value.toLocaleString()}`, "Value"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
