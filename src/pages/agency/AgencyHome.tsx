import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { mockClients, mockActivityFeed } from "@/data/mockData";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { Link } from "react-router-dom";
import { Users, DollarSign, Bot, TrendingUp, Loader2 } from "lucide-react";

const AgencyHome = () => {
  const { activities, loading: activitiesLoading } = useActivityFeed(8);
  const activityItems = activities.length > 0
    ? activities.map(a => ({ id: a.id, icon: a.icon, text: a.title, time: a.time }))
    : mockActivityFeed.slice(0, 8);

  return (
  <div className="space-y-6">
    <div className="page-header">
      <h1 className="page-title">Agency Overview</h1>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Clients" value={String(mockClients.length)} change="+2 this month" trend="up" index={0} />
      <StatCard title="Monthly Revenue" value="$2,782" change="+12%" trend="up" index={1} tint="success" />
      <StatCard title="Active Agents" value="38" change="across all clients" trend="stable" index={2} />
      <StatCard title="Avg Health Score" value="72" change="+4" trend="up" index={3} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
        <h3 className="font-semibold text-foreground mb-4">Client Overview</h3>
        <div className="space-y-3">
          {mockClients.slice(0, 5).map(c => (
            <Link key={c.id} to={`/agency/clients`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{c.businessName.charAt(0)}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.businessName}</p>
                  <p className="text-xs text-muted-foreground">{c.niche}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "Healthy" ? "bg-success/10 text-success" : c.status === "At Risk" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{c.status}</span>
            </Link>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        {activitiesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {activityItems.map(a => (
              <div key={a.id} className="flex gap-3 text-sm">
                <span className="text-base flex-shrink-0">{a.icon}</span>
                <div><p className="text-foreground leading-snug">{a.text}</p><p className="text-xs text-muted-foreground mt-0.5">{a.time}</p></div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  </div>
  );
};

export default AgencyHome;
