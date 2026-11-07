import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  icon: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
}

export function useActivityFeed(limit = 15) {
  const [activities, setActivities] = useState<(Activity & { time: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("activity_feed")
      .select("id, type, title, description, icon, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to load activity feed:", error);
      setActivities([]);
    } else {
      setActivities(
        (data || []).map((a: any) => ({ ...a, time: timeAgo(a.created_at) }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();

    // Real-time subscription for new activities
    const channel = supabase
      .channel("activity_feed_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => {
          const newActivity = payload.new as Activity;
          setActivities((prev) => [
            { ...newActivity, time: timeAgo(newActivity.created_at) },
            ...prev.slice(0, limit - 1),
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [limit]);

  return { activities, loading, refetch: fetchActivities };
}

// Helper to manually log an activity (for actions not covered by triggers)
export async function logActivity(params: {
  clientId: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
  contactId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) {
  const { error } = await supabase.from("activity_feed").insert({
    client_id: params.clientId,
    type: params.type,
    title: params.title,
    description: params.description || null,
    icon: params.icon || "📌",
    contact_id: params.contactId || null,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    metadata: params.metadata || {},
  });
  if (error) console.error("Failed to log activity:", error);
}
