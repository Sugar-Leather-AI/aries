import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { mockLeadChartData, mockRevenueChartData } from "@/data/mockData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, Mail } from "lucide-react";
import { BRAND } from "@/brand";

const showRateData = [
  { month: "Jan", rate: 74 }, { month: "Feb", rate: 78 }, { month: "Mar", rate: 82 },
  { month: "Apr", rate: 85 }, { month: "May", rate: 88 }, { month: "Jun", rate: 91 },
];

const dayOfWeekData = [
  { day: "Mon", apts: 8 }, { day: "Tue", apts: 6 }, { day: "Wed", apts: 9 },
  { day: "Thu", apts: 7 }, { day: "Fri", apts: 5 }, { day: "Sat", apts: 3 },
];

const agentPerformance = [
  { agent: "Lead Capture", triggers: 47, success: "94%", metric: "Avg 34s response", impact: "+$840" },
  { agent: "Apt Reminders", triggers: 124, success: "96%", metric: "6 no-shows prevented", impact: "+$1,200" },
  { agent: "Missed Call Text", triggers: 31, success: "68%", metric: "21 callbacks", impact: "+$460" },
  { agent: "Review Generator", triggers: 89, success: "9%", metric: "8 new reviews", impact: "4.8★ avg" },
  { agent: "No-Show Recovery", triggers: 6, success: "33%", metric: "2 recovered", impact: "+$280" },
];

const Reports = () => (
  <div className="space-y-6">
    <div className="page-header">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Reports</h1>
        <select className="text-sm border rounded-lg px-3 py-1.5 bg-card text-foreground">
          <option>This Month</option><option>Last Month</option><option>Last 90 Days</option><option>This Year</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Download PDF</Button>
        <Button variant="outline" size="sm"><Mail className="w-4 h-4 mr-1" />Email Report</Button>
      </div>
    </div>

    {/* Lead Performance */}
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">Lead Performance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard title="New Leads" value="47" change="+12%" trend="up" index={0} />
        <StatCard title="Avg Response" value="34s" change="-8s" trend="up" index={1} tint="success" />
        <StatCard title="Contacted <5min" value="94%" change="+6%" trend="up" index={2} />
        <StatCard title="Lead→Apt Conv" value="31%" change="+4%" trend="up" index={3} />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
        <h3 className="font-semibold text-foreground mb-3">Leads This Month</h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockLeadChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </section>

    {/* Appointment Performance */}
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">Appointment Performance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard title="Total Apts" value="38" change="+8" trend="up" index={0} />
        <StatCard title="Show Rate" value="91%" change="+23%" trend="up" index={1} tint="success" />
        <StatCard title="No-Shows" value="4" change="-6" trend="up" index={2} />
        <StatCard title="Cancellations" value="6" change="-2" trend="up" index={3} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Show Rate Trend</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={showRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Appointments by Day</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="apts" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Agent ROI */}
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">💰 Your Automation ROI This Month</h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card border-2 border-primary/20 bg-accent/30">
        <p className="text-lg font-bold text-foreground">Your {BRAND.name} automations delivered an estimated $3,240 in value this month</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div><p className="text-sm font-semibold text-foreground">6</p><p className="text-xs text-muted-foreground">No-shows prevented</p></div>
          <div><p className="text-sm font-semibold text-foreground">43 hrs</p><p className="text-xs text-muted-foreground">Hours saved</p></div>
          <div><p className="text-sm font-semibold text-foreground">47</p><p className="text-xs text-muted-foreground">Leads responded</p></div>
          <div><p className="text-sm font-semibold text-foreground">8</p><p className="text-xs text-muted-foreground">Reviews generated</p></div>
        </div>
      </motion.div>

      <div className="stat-card p-0 overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Triggers</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Success</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Key Metric</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Impact</th>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map((a, i) => (
              <tr key={i} className="border-b">
                <td className="p-3 font-medium text-foreground">{a.agent}</td>
                <td className="p-3 text-foreground">{a.triggers}</td>
                <td className="p-3 text-foreground">{a.success}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{a.metric}</td>
                <td className="p-3 text-success font-medium">{a.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>
);

export default Reports;
