import { useState } from "react";
import { motion } from "framer-motion";
import { mockClients, niches } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Plus, Eye } from "lucide-react";
import { toast } from "sonner";

const statusFilters = ["All", "Healthy", "At Risk", "Churning"];

const AgencyClients = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [nicheFilter, setNicheFilter] = useState("All");
  const { viewAsClient } = useAuth();
  const navigate = useNavigate();

  const filtered = mockClients.filter(c => {
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (nicheFilter !== "All" && c.niche !== nicheFilter) return false;
    if (search) return c.businessName.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const handleViewClient = (id: string) => {
    viewAsClient(id);
    toast.success("Viewing as client");
    navigate("/dashboard");
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
        <Button size="sm" onClick={() => navigate("/agency/clients/new")}><Plus className="w-4 h-4 mr-1" />Add Client</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{s}</button>
          ))}
        </div>
        <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)}
          className="text-xs border rounded-lg px-2 py-1.5 bg-card text-foreground">
          <option value="All">All Niches</option>
          {niches.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Business</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Niche</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Health</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">MRR</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Agents</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Contacts</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleViewClient(c.id)}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{c.businessName.charAt(0)}</div>
                    <div><p className="font-medium text-foreground">{c.businessName}</p><p className="text-xs text-muted-foreground">{c.ownerName}</p></div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{c.niche}</td>
                <td className="p-3"><span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                  c.status === "Healthy" ? "bg-success/10 text-success" : c.status === "At Risk" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>{c.status}</span></td>
                <td className="p-3 font-medium text-foreground hidden lg:table-cell">{c.healthScore}%</td>
                <td className="p-3 text-foreground hidden lg:table-cell">${c.mrr}</td>
                <td className="p-3 text-foreground hidden xl:table-cell">{c.agentsActive}</td>
                <td className="p-3 text-foreground hidden xl:table-cell">{c.contacts}</td>
                <td className="p-3 text-right"><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-4 h-4" /></Button></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgencyClients;
