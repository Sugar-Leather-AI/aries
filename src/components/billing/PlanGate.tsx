// A page for an AI agent that isn't in the business's plan: shows what it does
// and how to add it, instead of the page itself (brands with plans).
import { BRAND } from "@/brand";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan, type PlanFeature } from "@/hooks/usePlan";

const INFO: Record<PlanFeature, { name: string; what: string; points: string[]; price: string; inTrial?: boolean }> = {
  aria: { name: "Aria, AI receptionist", what: "Replies to new leads and customers by email, WhatsApp and website chat in minutes, in your voice.", points: ["Answers every enquiry, day or night", "Scores each lead and notes it in your CRM", "Hands off anything unusual to you"], price: "In every bundle, or $99 a month", inTrial: true },
  voice: { name: "Phone answering", what: "Aria answers your phone in a natural voice, answers questions about your business, takes messages and transfers urgent calls to you.", points: ["A phone number for Aria to answer", "Summary, transcript and recording of every call", "Callers added to your contacts automatically"], price: "In every bundle (150 to 600 minutes), or $199 a month for 350 minutes" },
  luna: { name: "Luna, AI sales rep", what: "Plans how to win each lead, writes personal emails from your domain and follows up until they reply. You approve first.", points: ["A plan and first email for every lead", "Follow-ups paced like a person would", "Stops the moment someone replies"], price: "In Growth and Full Team, or $249 a month", inTrial: true },
  prospector: { name: "Lead Prospector", what: "Finds companies showing buying signals, scores them for fit and finds the right person with a verified email.", points: ["Hiring, funding and expansion signals", "Verified work emails", "New leads every week"], price: "In Full Team, or $149 a month", inTrial: true },
  content: { name: "Content Studio", what: "Plans and writes a week of social posts with images, then posts the ones you approve at the right times.", points: ["LinkedIn, Facebook, Instagram, X, Threads and TikTok", "Images made for each post", "Auto-posts what you approve"], price: "In Growth and Full Team, or $99 a month", inTrial: true },
  reviews: { name: "Review Generator", what: "Asks customers for a Google review when a job wraps up, sends one reminder and drafts replies to new reviews.", points: ["Requests sent at the right moment", "Knows who has reviewed", "Reply drafts for every review"], price: "In every bundle, or $79 a month", inTrial: true },
  growth: { name: "Account Growth", what: "Finds the next deal in every client: stalled proposals, the next service to offer and work that should be a monthly plan.", points: ["Health score for every client", "Next best moves with ready emails", "Weekly review on Mondays"], price: "In Growth and Full Team, or $129 a month", inTrial: true },
  seo: { name: "SEO Agent", what: "A weekly report on how customers find your website on Google, with the fixes that will help most.", points: ["Google Search Console data", "Site check of your key pages", "Exact titles and descriptions to use"], price: "In Full Team, or $99 a month", inTrial: true },
};

export const featureName = (f: PlanFeature) => INFO[f].name;

export default function PlanGate({ feature, children }: { feature: PlanFeature; children: ReactNode }) {
  const plan = usePlan();
  if (plan.loading) return <div className="grid place-items-center py-24"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (plan.has(feature)) return <>{children}</>;

  const info = INFO[feature];
  const headline = !plan.active
    ? "Your free trial has ended"
    : plan.trial && !info.inTrial
      ? `${info.name} starts when you choose a plan`
      : `${info.name} isn't in your plan yet`;
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="stat-card space-y-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"><Lock className="w-3.5 h-3.5" />Upgrade</span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{headline}</h1>
          <p className="text-muted-foreground">{info.what}</p>
        </div>
        <ul className="space-y-2">
          {info.points.map((p) => <li key={p} className="flex gap-2 text-sm text-foreground"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{p}</li>)}
        </ul>
        <p className="text-sm text-muted-foreground">{info.price}.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/settings?tab=Billing">{plan.active ? "Add to my plan" : "Choose a plan"}</Link></Button>
          <Button variant="outline" asChild><a href={BRAND.pricingUrl ?? "/pricing"} target="_blank" rel="noopener noreferrer">See pricing</a></Button>
        </div>
      </div>
    </div>
  );
}
