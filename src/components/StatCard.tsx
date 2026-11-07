import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { mockSparklineData } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "stable";
  index?: number;
  tint?: "default" | "success" | "warning" | "destructive";
}

const tintColors = {
  default: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
};

const StatCard = ({ title, value, change, trend, index = 0, tint = "default" }: StatCardProps) => {
  const sparkData = mockSparklineData(trend);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {trend === "up" ? <ArrowUp className="w-3 h-3 text-success" /> : trend === "down" ? <ArrowDown className="w-3 h-3 text-destructive" /> : null}
            <span className={`text-xs font-medium ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>{change}</span>
          </div>
        </div>
        <div className="w-20 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="value" stroke={tintColors[tint]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
