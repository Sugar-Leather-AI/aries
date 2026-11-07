import { useState } from "react";
import { Link, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Users, LogOut, Menu, ShieldCheck, Receipt, LayoutDashboard } from "lucide-react";
import { ADMIN_PAGES } from "@/brand/pack";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Costs", icon: Receipt, path: "/admin/costs" },
  { label: "Billing", icon: CreditCard, path: "/admin/billing" },
  // Pages from other storefronts in this copy of the code (src/brand/pack.ts).
  ...ADMIN_PAGES.map(({ label, icon, path }) => ({ label, icon, path })),
];

const AdminLayout = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Guard: only super admins may access the admin area.
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Platform Admin</p>
          <p className="text-xs text-muted-foreground truncate">{user?.fullName}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              className={cn("nav-item", active && "nav-item-active")}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        {user?.clientId && (
          <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="nav-item w-full mb-1">
            <LayoutDashboard className="w-5 h-5" /><span>My dashboard</span>
          </Link>
        )}
        <button onClick={handleLogout} className="nav-item w-full text-destructive">
          <LogOut className="w-5 h-5" /><span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[240px] bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar z-50 lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card flex-shrink-0">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {user?.fullName?.charAt(0) || "A"}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
