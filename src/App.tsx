import { lazyPage } from "@/lib/lazyPage";
import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

const ClientLayout = lazyPage(() => import("@/layouts/ClientLayout"));
const Dashboard = lazyPage(() => import("@/pages/client/Dashboard"));
const Inbox = lazyPage(() => import("@/pages/client/Inbox"));
const Contacts = lazyPage(() => import("@/pages/client/Contacts"));
const Companies = lazyPage(() => import("@/pages/client/Companies"));
const Calendar = lazyPage(() => import("@/pages/client/Calendar"));
const Pipeline = lazyPage(() => import("@/pages/client/Pipeline"));
const Agents = lazyPage(() => import("@/pages/client/Agents"));
const Reputation = lazyPage(() => import("@/pages/client/Reputation"));
const Payments = lazyPage(() => import("@/pages/client/Payments"));
const Reports = lazyPage(() => import("@/pages/client/Reports"));
const Integrations = lazyPage(() => import("@/pages/client/Integrations"));
const ClientSettings = lazyPage(() => import("@/pages/client/Settings"));
const Projects = lazyPage(() => import("@/pages/client/Projects"));
const ExecutiveAssistant = lazyPage(() => import("@/pages/client/ExecutiveAssistant"));

const AgencyLayout = lazyPage(() => import("@/layouts/AgencyLayout"));
const AgencyHome = lazyPage(() => import("@/pages/agency/AgencyHome"));
const AgencyClients = lazyPage(() => import("@/pages/agency/AgencyClients"));
const AddClient = lazyPage(() => import("@/pages/agency/AddClient"));
const WhiteLabel = lazyPage(() => import("@/pages/agency/WhiteLabel"));

const AdminLayout = lazyPage(() => import("@/layouts/AdminLayout"));
const AdminUsers = lazyPage(() => import("@/pages/admin/AdminUsers"));
const AdminCosts = lazyPage(() => import("@/pages/admin/AdminCosts"));
const AdminBilling = lazyPage(() => import("@/pages/admin/AdminBilling"));

const Landing = lazyPage(() => import("@/pages/Landing"));
const Pricing = lazyPage(() => import("@/pages/Pricing"));
import PlanGate from "@/components/billing/PlanGate";
import type { PlanFeature } from "@/hooks/usePlan";
import { PACK, ADMIN_PAGES } from "@/brand/pack";
// Brands with plans: pages for agents outside the plan show an upgrade preview instead.
const gated = (f: PlanFeature, el: JSX.Element) => (BRAND.features.plans ? <PlanGate feature={f}>{el}</PlanGate> : el);

// A storefront can bring its own marketing pages, app shell and home screen
// (src/brand/pack.ts); everything else after sign-in is shared.
const SiteLanding = PACK.Landing ?? Landing;
const SitePricing = PACK.Pricing ?? Pricing;
const AppShell = PACK.Layout ?? ClientLayout;
const Home = PACK.Home ?? Dashboard;
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
const SitePrivacy = PACK.Privacy ?? Privacy;
const SiteTerms = PACK.Terms ?? Terms;
const MarketingPage = PACK.MarketingPage;
import NotFound from "@/pages/NotFound";
import { useLocation } from "react-router-dom";
import { APP_URL, MARKETING_URL, MARKETING_PATHS, isAppHost, isMarketingHost } from "@/lib/domains";
import { BRAND } from "@/brand";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Sends a page to the site it belongs on (marketing vs app). Returns true while redirecting.
function useCrossSiteRedirect(): boolean {
  const { pathname, search, hash } = useLocation();
  const target = isMarketingHost && !MARKETING_PATHS.includes(pathname)
    ? APP_URL
    : isAppHost && pathname === "/pricing"
      ? MARKETING_URL
      : null;
  if (target) window.location.replace(`${target}${pathname}${search}${hash}`);
  return target !== null;
}

const homePath = (role?: string) =>
  role === "super_admin" ? "/admin" : role === "agency_owner" ? "/agency" : "/dashboard";

const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const redirecting = useCrossSiteRedirect();
  if (redirecting) return null;

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-muted border-t-primary animate-spin" /></div>}>
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === "super_admin" ? "/admin" : user?.role === "agency_owner" ? "/agency" : "/dashboard"} /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Client routes */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/agents" element={<Agents />} />
        {/* Agent pages a storefront may not have: old links go to the agent list. */}
        {["/outreach", "/seo", "/calls"].filter((path) => !PACK.appPages?.some((p) => p.path === path)).map((path) => (
          <Route key={path} path={path} element={<Navigate to="/agents" replace />} />
        ))}
        {(PACK.appPages ?? []).map((p) => (
          <Route key={p.path} path={p.path}
            element={!p.feature || BRAND.features[p.feature as keyof typeof BRAND.features]
              ? (p.plan ? gated(p.plan as PlanFeature, <>{p.element}</>) : p.element)
              : <Navigate to="/agents" replace />} />
        ))}
        <Route path="/reputation" element={gated("reviews", <Reputation />)} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/executive-assistant" element={gated("content", <ExecutiveAssistant />)} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<ClientSettings />} />
      </Route>

      {/* Platform admin routes (super_admin only, guarded in AdminLayout) */}
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/costs" element={<AdminCosts />} />
        <Route path="/admin/billing" element={<AdminBilling />} />
        {ADMIN_PAGES.map((p) => <Route key={p.path} path={p.path} element={p.element} />)}
      </Route>

      {/* Agency routes */}
      <Route element={<ProtectedRoute><AgencyLayout /></ProtectedRoute>}>
        <Route path="/agency" element={<AgencyHome />} />
        <Route path="/agency/clients" element={<AgencyClients />} />
        <Route path="/agency/clients/new" element={<AddClient />} />
        <Route path="/agency/white-label" element={<WhiteLabel />} />
        <Route path="/agency/reports" element={<Reports />} />
        <Route path="/agency/billing" element={<ClientSettings />} />
        <Route path="/agency/settings" element={<ClientSettings />} />
      </Route>

      <Route path="/" element={isAppHost ? <Navigate to={isAuthenticated ? homePath(user?.role) : "/login"} replace /> : <SiteLanding />} />
      <Route path="/pricing" element={<SitePricing />} />
      {MarketingPage && (PACK.marketingPaths ?? []).map((p) => <Route key={p} path={p} element={<MarketingPage />} />)}
      <Route path="/privacy" element={<SitePrivacy />} />
      <Route path="/terms" element={<SiteTerms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
