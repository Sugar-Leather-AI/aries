import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarRadiusAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import {
  Target, TrendingUp, Zap, AlertTriangle, CheckCircle2, ArrowRight,
  MessageSquare, Users, BarChart3, Lightbulb, ShieldCheck
} from "lucide-react";

interface Props {
  analysis: any;
  company: { name: string; industry?: string | null; employee_count?: string | null };
}

// ── Prospect Score Gauge ────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "High Fit" : score >= 40 ? "Moderate" : "Low Fit";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="70%" outerRadius="100%"
            startAngle={210} endAngle={-30}
            data={[{ value: score, fill: color }]}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "hsl(var(--muted))" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Radar chart for industry signals ───────────────────────────────────
function SignalRadar({ trends, opportunities, challenges }: { trends: string[]; opportunities: string[]; challenges: string[] }) {
  const data = [
    { subject: "Trends", value: Math.min(trends?.length * 25, 100) },
    { subject: "Opportunity", value: Math.min(opportunities?.length * 30, 100) },
    { subject: "Risk", value: Math.min(challenges?.length * 30, 100) },
    { subject: "Market", value: 70 },
    { subject: "Growth", value: 65 },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius={65}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          formatter={(v: any) => [`${v}%`, "Signal Strength"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Horizontal bar ──────────────────────────────────────────────────────
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CompanyInsightVisual({ analysis, company }: Props) {
  if (!analysis) return null;

  const score = analysis.prospect_score?.score ?? 0;
  const scoreColor = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  const growth = analysis.market_segment?.growth_potential ?? "";
  const growthScore = growth.toLowerCase().includes("high") ? 80
    : growth.toLowerCase().includes("medium") || growth.toLowerCase().includes("moderate") ? 55 : 35;

  const services: string[] = analysis.company_summary?.key_services ?? [];
  const usps: string[] = analysis.company_summary?.unique_selling_points ?? [];
  const trends: string[] = analysis.industry_insights?.trends ?? [];
  const opportunities: string[] = analysis.industry_insights?.opportunities ?? [];
  const challenges: string[] = analysis.industry_insights?.challenges ?? [];
  const channels: string[] = analysis.communication_strategy?.preferred_channels ?? [];
  const talkingPoints: string[] = analysis.communication_strategy?.key_talking_points ?? [];
  const nextSteps: string[] = analysis.sales_strategy?.next_steps ?? [];
  const valueProps: string[] = analysis.sales_strategy?.value_propositions ?? [];

  return (
    <div className="space-y-4 pb-4">

      {/* ── Row 1: Score + Snapshot ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Score card */}
        <div className="rounded-xl border bg-card p-4 flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1 flex items-center gap-1">
            <Target className="w-3 h-3" /> Prospect Score
          </p>
          <ScoreGauge score={score} />
          <p className="text-[10px] text-center text-muted-foreground leading-relaxed mt-1 px-1">
            {analysis.prospect_score?.recommendation?.split(".")[0]}.
          </p>
        </div>

        {/* Quick stats */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Key Signals
          </p>
          <Bar label="Growth Potential" value={growthScore} color={scoreColor} />
          <Bar label="Opportunities" value={Math.min(opportunities.length * 25, 95)} color="#10b981" />
          <Bar label="Challenges" value={Math.min(challenges.length * 20, 80)} color="#f59e0b" />
          <Bar label="Trend Alignment" value={Math.min(trends.length * 20, 90)} color="hsl(var(--primary))" />
          <div className="pt-1">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              growth.toLowerCase().includes("high") ? "bg-emerald-500/10 text-emerald-600" :
              growth.toLowerCase().includes("medium") || growth.toLowerCase().includes("moderate") ? "bg-amber-500/10 text-amber-600" :
              "bg-muted text-muted-foreground"
            )}>
              {analysis.market_segment?.classification} · {growth} Growth
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Industry Radar + Services ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Industry Signals
          </p>
          <SignalRadar trends={trends} opportunities={opportunities} challenges={challenges} />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3" /> Services
          </p>
          {services.slice(0, 4).map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="text-[11px] text-foreground leading-tight">{s}</span>
            </div>
          ))}
          {usps.length > 0 && (
            <>
              <div className="border-t pt-2 mt-1">
                <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold mb-1.5">USPs</p>
                {usps.slice(0, 3).map((u, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <span className="text-amber-500 text-[10px] mt-0.5">★</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{u}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Opportunities vs Challenges ── */}
      {(opportunities.length > 0 || challenges.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-emerald-500/5 border-emerald-200/60 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Opportunities
            </p>
            {opportunities.map((o, i) => (
              <p key={i} className="text-[11px] text-foreground flex items-start gap-1.5 leading-tight">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{o}
              </p>
            ))}
          </div>
          <div className="rounded-xl border bg-amber-500/5 border-amber-200/60 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Challenges
            </p>
            {challenges.map((c, i) => (
              <p key={i} className="text-[11px] text-foreground flex items-start gap-1.5 leading-tight">
                <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>{c}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 4: Communication ── */}
      {analysis.communication_strategy && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> How to Reach Them
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Tone</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">{analysis.communication_strategy.tone}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Best Time</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">{analysis.communication_strategy.best_time_to_reach}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Channels</p>
              <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                {channels.slice(0, 2).map((ch, i) => (
                  <span key={i} className="text-[9px] font-medium text-primary">{ch}</span>
                ))}
              </div>
            </div>
          </div>
          {talkingPoints.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">Key Talking Points</p>
              <div className="space-y-1">
                {talkingPoints.slice(0, 3).map((tp, i) => (
                  <p key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                    <span className="text-primary shrink-0 mt-0.5">•</span>{tp}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Row 5: Value Props + Next Steps ── */}
      {analysis.sales_strategy && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Sales Playbook
          </p>
          {valueProps.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-1.5">Value Propositions</p>
              <div className="flex flex-wrap gap-1.5">
                {valueProps.map((vp, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 font-medium">
                    {vp}
                  </span>
                ))}
              </div>
            </div>
          )}
          {nextSteps.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">Next Steps</p>
              <div className="space-y-1.5">
                {nextSteps.map((ns, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[11px] text-foreground">{ns}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analysis.sales_strategy.approach && (
            <p className="text-[10px] text-muted-foreground italic border-t pt-2 mt-1">{analysis.sales_strategy.approach}</p>
          )}
        </div>
      )}

      {/* ── Target audience ── */}
      {analysis.company_summary?.target_audience && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1 mb-1.5">
            <Users className="w-3 h-3" /> Target Audience
          </p>
          <p className="text-[11px] text-foreground leading-relaxed">{analysis.company_summary.target_audience}</p>
        </div>
      )}
    </div>
  );
}
