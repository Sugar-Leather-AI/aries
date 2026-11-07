// Headline numbers and data-driven insights for a business's home screen.
// Shared by the Aries dashboard and other brands' home screens so all brands
// always show the same figures; each screen styles them its own way.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/brand";

export interface BusinessStats {
  totalContacts: number;
  contactsThisMonth: number;
  contactsLastMonth: number;
  totalDeals: number;
  pipelineValue: number;
  wonDealsValue: number;
  wonDealsCount: number;
  appointmentsThisMonth: number;
  appointmentsLastMonth: number;
  reviewsCount: number;
  avgRating: number;
  messagesInbound: number;
  messagesOutbound: number;
  unreadMessages: number;
  invoicesPaid: number;
  invoicesTotal: number;
}

/** kind picks the colour: each screen maps it to its own palette. */
export interface Insight { kind: "inbox" | "warning" | "success" | "pipeline" | "reviews" | "info" | "welcome"; title: string; desc: string; cta: string; to: string }

export function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

const pctChange = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));
const money = (n: number) => `$${n.toLocaleString()}`;

export function useBusinessStats(clientId: string | null | undefined) {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const thisMonth = monthRange(0);
      const lastMonth = monthRange(-1);
      const [contactsAll, contactsThis, contactsLast, dealsAll, apptThis, apptLast, reviewsAll, messagesAll, invoicesAll] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", thisMonth.start).lte("created_at", thisMonth.end),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", lastMonth.start).lte("created_at", lastMonth.end),
        supabase.from("deals").select("value, stage").eq("client_id", clientId),
        // Appointments are stored by scheduled_at.
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "cancelled").gte("scheduled_at", thisMonth.start).lte("scheduled_at", thisMonth.end),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "cancelled").gte("scheduled_at", lastMonth.start).lte("scheduled_at", lastMonth.end),
        supabase.from("reviews").select("rating").eq("client_id", clientId),
        supabase.from("messages").select("direction, is_read").eq("client_id", clientId),
        supabase.from("invoices").select("amount, status").eq("client_id", clientId),
      ]);
      const deals = (dealsAll.data || []) as { value: number | null; stage: string }[];
      const reviews = (reviewsAll.data || []) as { rating: number | null }[];
      const messages = (messagesAll.data || []) as { direction: string; is_read: boolean | null }[];
      const invoices = (invoicesAll.data || []) as { amount: number | null; status: string | null }[];
      const won = deals.filter((d) => d.stage === "Won");
      const inbound = messages.filter((m) => m.direction === "inbound");
      setStats({
        totalContacts: contactsAll.count || 0,
        contactsThisMonth: contactsThis.count || 0,
        contactsLastMonth: contactsLast.count || 0,
        totalDeals: deals.length,
        pipelineValue: deals.reduce((s, d) => s + (d.value || 0), 0),
        wonDealsValue: won.reduce((s, d) => s + (d.value || 0), 0),
        wonDealsCount: won.length,
        appointmentsThisMonth: apptThis.count || 0,
        appointmentsLastMonth: apptLast.count || 0,
        reviewsCount: reviews.length,
        avgRating: reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0,
        messagesInbound: inbound.length,
        messagesOutbound: messages.length - inbound.length,
        unreadMessages: inbound.filter((m) => !m.is_read).length,
        // Invoices are saved with a capitalised status ("Paid").
        invoicesPaid: invoices.filter((i) => String(i.status).toLowerCase() === "paid").reduce((s, i) => s + (i.amount || 0), 0),
        invoicesTotal: invoices.reduce((s, i) => s + (i.amount || 0), 0),
      });
      setLoading(false);
    })();
  }, [clientId]);

  const contactChange = stats ? pctChange(stats.contactsThisMonth, stats.contactsLastMonth) : 0;
  const appointmentChange = stats ? pctChange(stats.appointmentsThisMonth, stats.appointmentsLastMonth) : 0;
  const winRate = stats && stats.totalDeals > 0 ? Math.round((stats.wonDealsCount / stats.totalDeals) * 100) : 0;

  const insights: Insight[] = [];
  if (stats) {
    if (stats.unreadMessages > 0) {
      insights.push({ kind: "inbox", title: `${stats.unreadMessages} unread message${stats.unreadMessages !== 1 ? "s" : ""} in your inbox`, desc: `You have ${stats.messagesInbound} inbound and ${stats.messagesOutbound} outbound messages total. Stay on top of leads by responding quickly.`, cta: "Open Inbox", to: "/inbox" });
    }
    if (stats.contactsThisMonth > 0 && stats.appointmentsThisMonth === 0) {
      insights.push({ kind: "warning", title: `${stats.contactsThisMonth} new leads but no appointments yet`, desc: "New contacts have come in this month but none have booked. Consider sending a campaign or following up.", cta: "View Contacts", to: "/contacts" });
    } else if (contactChange > 10) {
      insights.push({ kind: "success", title: `Leads up ${contactChange}% this month`, desc: `You've added ${stats.contactsThisMonth} contacts this month vs ${stats.contactsLastMonth} last month. Your growth is accelerating.`, cta: "View Pipeline", to: "/pipeline" });
    }
    if (stats.pipelineValue > 0 && stats.wonDealsCount === 0) {
      insights.push({ kind: "pipeline", title: `${money(stats.pipelineValue)} in pipeline with no closed deals`, desc: `You have ${stats.totalDeals} active deals. Focus on moving qualified deals to proposals and closing.`, cta: "Manage Deals", to: "/pipeline" });
    } else if (winRate > 0) {
      insights.push({ kind: "success", title: `${winRate}% win rate, ${money(stats.wonDealsValue)} closed`, desc: `You've won ${stats.wonDealsCount} of ${stats.totalDeals} deals. ${winRate >= 30 ? "Great performance!" : "There's room to improve conversions."}`, cta: "View Pipeline", to: "/pipeline" });
    }
    if (stats.reviewsCount > 0 && stats.avgRating >= 4) {
      insights.push({ kind: "reviews", title: `${stats.avgRating.toFixed(1)} avg rating across ${stats.reviewsCount} reviews`, desc: "Your reputation is strong. Keep requesting reviews from happy customers to maintain momentum.", cta: "Request Reviews", to: "/reputation" });
    } else if (stats.reviewsCount === 0) {
      insights.push({ kind: "info", title: "No reviews yet. Start building social proof", desc: "Reviews boost trust and SEO. Send review requests to your happiest customers to get started.", cta: "Go to Reputation", to: "/reputation" });
    }
    if (insights.length === 0) {
      insights.push({ kind: "welcome", title: `Welcome to ${BRAND.name}`, desc: "Start by adding contacts, creating deals in your pipeline, and configuring your AI agents.", cta: "Get Started", to: "/contacts" });
    }
  }

  return { stats, loading, contactChange, appointmentChange, winRate, insights };
}
