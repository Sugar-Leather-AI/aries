import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LeadCaptureWidget from "@/components/LeadCaptureWidget";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send,
  LayoutDashboard, Inbox, Users, CalendarDays, RefreshCw, Bot,
  Star, CreditCard, BarChart3, Plug, Settings, LogOut, Menu, X,
  ChevronLeft, Bell, Building2, FolderKanban, Mail, MessageSquare,
  Calendar, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import ExecutiveAssistantIcon from "@/components/icons/ExecutiveAssistantIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandLogo";
import { BRAND } from "@/brand";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4 text-blue-500" />,
  sms: <MessageSquare className="w-4 h-4 text-emerald-500" />,
  appointment: <Calendar className="w-4 h-4 text-ember-500" />,
  alert: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

function notifTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inbox", icon: Inbox, path: "/inbox", badgeKey: "inbox" as const },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "Pipeline", icon: RefreshCw, path: "/pipeline" },
  { label: "Projects", icon: FolderKanban, path: "/projects" },
  { label: "Agents", icon: Bot, path: "/agents" },
  ...(BRAND.features.outreach ? [{ label: "Outreach", icon: Send, path: "/outreach" }] : []),
  { label: "Reputation", icon: Star, path: "/reputation" },
  { label: "Executive Assistant", icon: ExecutiveAssistantIcon, path: "/executive-assistant" },
  { label: "Payments", icon: CreditCard, path: "/payments" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Integrations", icon: Plug, path: "/integrations" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const ClientLayout = () => {
  const { user, logout, isViewingAsClient, exitClientView, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!user?.clientId) return;
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("client_id", user.clientId)
      .eq("direction", "inbound")
      .eq("is_read", false);
    setUnreadCount(count || 0);
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setNotificationCount((data || []).filter((n: Notification) => !n.read).length);
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  const markAllNotifsRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationCount(0);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();

    const channel = supabase
      .channel("layout-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchUnreadCount())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => fetchUnreadCount())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchNotifications())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.clientId]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <BrandMark className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <BrandMark className="w-9 h-9 rounded-lg mx-auto" />
        )}
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              className={cn("nav-item", active && "nav-item-active", collapsed && "justify-center px-0")}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badgeKey === "inbox" && unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {isViewingAsClient && (
          <button onClick={() => { exitClientView(); navigate("/agency/clients"); }}
            className="nav-item w-full mb-1 text-warning">
            <ChevronLeft className="w-5 h-5" />
            {!collapsed && <span>Back to Agency</span>}
          </button>
        )}
        {isSuperAdmin && (
          <Link to="/admin" onClick={() => setMobileOpen(false)}
            className={cn("nav-item w-full mb-1", collapsed && "justify-center px-0")}>
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Platform admin</span>}
          </Link>
        )}
        <button onClick={handleLogout} className="nav-item w-full text-destructive">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-4 -right-3 w-6 h-6 rounded-full bg-card border flex items-center justify-center hover:bg-accent z-10 hidden lg:flex"
          style={{ left: collapsed ? "56px" : "228px" }}>
          <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar z-50 lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card flex-shrink-0">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell className="w-5 h-5" />
                {(unreadCount + notificationCount) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
                    {(unreadCount + notificationCount) > 99 ? "99+" : unreadCount + notificationCount}
                  </span>
                )}
              </Button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[360px] bg-card border rounded-lg shadow-lg z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                      {notificationCount > 0 && (
                        <button onClick={markAllNotifsRead} className="text-xs text-primary hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Unread messages section */}
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { navigate("/inbox"); setNotifOpen(false); }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 border-b transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Inbox className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">Open inbox to view</p>
                        </div>
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      </button>
                    )}

                    {/* Notifications list */}
                    <div className="max-h-[320px] overflow-y-auto">
                      {notifications.length === 0 && unreadCount === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.read) markNotifRead(n.id);
                              if (n.action_url) { navigate(n.action_url); setNotifOpen(false); }
                            }}
                            className={cn(
                              "w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-muted/50 border-b last:border-b-0",
                              !n.read && "bg-primary/5"
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                              {NOTIF_ICONS[n.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm text-foreground", !n.read && "font-medium")}>{n.title}</p>
                              {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                              <p className="text-[10px] text-muted-foreground mt-1">{notifTimeAgo(n.created_at)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {user?.fullName?.charAt(0) || "U"}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      {user?.clientId && <LeadCaptureWidget clientId={user.clientId} />}
    </div>
  );
};

export default ClientLayout;
