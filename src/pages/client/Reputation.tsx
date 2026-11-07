import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Star, Bot, MessageSquare, Plus, RefreshCw, Loader2, Copy, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ReviewRequestsPanel } from "@/components/reputation/ReviewRequestsPanel";

type Review = {
  id: string;
  contact_name: string | null;
  content: string | null;
  rating: number;
  platform: string | null;
  posted_at: string | null;
  responded: boolean | null;
  response: string | null;
  client_id: string;
};

const Reputation = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newReview, setNewReview] = useState({ contact_name: "", content: "", rating: "5", platform: "Google" });

  const clientId = user?.clientId;

  useEffect(() => {
    if (clientId) fetchReviews();
  }, [clientId]);

  const fetchReviews = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("client_id", clientId)
      .order("posted_at", { ascending: false });
    if (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  const syncGoogle = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews");
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Synced ${data.synced} new reviews from Google`);
        fetchReviews();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to sync Google reviews");
    }
    setSyncing(false);
  };

  const addManualReview = async () => {
    if (!clientId || !newReview.contact_name) return;
    const reviewData = {
      client_id: clientId,
      contact_name: newReview.contact_name,
      content: newReview.content,
      rating: parseInt(newReview.rating),
      platform: newReview.platform,
      posted_at: new Date().toISOString(),
      responded: false,
    };
    const { error } = await supabase.from("reviews").insert(reviewData);
    if (error) {
      toast.error("Failed to add review");
    } else {
      toast.success("Review added");
      setAddOpen(false);
      setNewReview({ contact_name: "", content: "", rating: "5", platform: "Google" });
      fetchReviews();
      // Send email notification
      supabase.functions.invoke("review-notification", {
        body: { review: reviewData },
      }).catch(() => {});
    }
  };

  const generateAiResponse = async (review: Review) => {
    setGeneratingId(review.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-review-response", {
        body: {
          review_content: review.content,
          reviewer_name: review.contact_name,
          rating: review.rating,
          client_id: clientId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.response) {
        setRespondingId(review.id);
        setResponseText(data.response);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate response");
    }
    setGeneratingId(null);
  };

  const saveResponse = async (reviewId: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ response: responseText, responded: true })
      .eq("id", reviewId);
    if (error) {
      toast.error("Failed to save response");
    } else {
      toast.success("Response saved");
      setRespondingId(null);
      setResponseText("");
      fetchReviews();
    }
  };

  const filtered = filter === "All" ? reviews :
    filter === "Responded" ? reviews.filter(r => r.responded) :
    filter === "Not Responded" ? reviews.filter(r => !r.responded) :
    reviews.filter(r => r.rating === parseInt(filter));

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  const respondedCount = reviews.filter(r => r.responded).length;
  const responseRate = reviews.length > 0
    ? Math.round((respondedCount / reviews.length) * 100)
    : 0;

  // Build trend data from reviews
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendMap = new Map<string, { sum: number; count: number }>();
  reviews.forEach(r => {
    if (!r.posted_at) return;
    const d = new Date(r.posted_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const existing = trendMap.get(key) || { sum: 0, count: 0 };
    trendMap.set(key, { sum: existing.sum + r.rating, count: existing.count + 1 });
  });
  const ratingTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({
      month: monthNames[parseInt(key.split("-")[1])],
      rating: parseFloat((val.sum / val.count).toFixed(1)),
    }));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Reputation</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncGoogle} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Sync Google
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Review Manually</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Reviewer name" value={newReview.contact_name} onChange={e => setNewReview(p => ({ ...p, contact_name: e.target.value }))} />
                <Textarea placeholder="Review content" value={newReview.content} onChange={e => setNewReview(p => ({ ...p, content: e.target.value }))} />
                <div className="flex gap-3">
                  <Select value={newReview.rating} onValueChange={v => setNewReview(p => ({ ...p, rating: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map(n => <SelectItem key={n} value={String(n)}>{n}★</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newReview.platform} onValueChange={v => setNewReview(p => ({ ...p, platform: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Google", "Yelp", "Facebook", "Other"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={addManualReview} disabled={!newReview.contact_name}>Save Review</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Avg Rating" value={`${avgRating}★`} change="" trend="up" index={0} tint="success" />
        <StatCard title="Total Reviews" value={String(reviews.length)} change="" trend="up" index={1} />
        <StatCard title="Responded" value={String(respondedCount)} change="" trend="up" index={2} />
        <StatCard title="Response Rate" value={`${responseRate}%`} change="" trend="up" index={3} />
      </div>

      {clientId && <ReviewRequestsPanel clientId={clientId} />}

      {ratingTrend.length > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">Rating Trend</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["All", "5", "4", "3", "2", "1", "Responded", "Not Responded"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
            {f.length === 1 ? `${f}★` : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No reviews yet. Add one manually or sync from Google.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review, i) => (
            <motion.div key={review.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="stat-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                    {(review.platform || "G")[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{review.contact_name || "Anonymous"}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={cn("w-3 h-3", j < review.rating ? "fill-warning text-warning" : "text-muted")} />
                      ))}
                      {review.platform && (
                        <span className="ml-2 text-[10px] text-muted-foreground">{review.platform}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(review.posted_at)}</span>
              </div>
              {review.content && (
                <p className="text-sm text-foreground mt-2 leading-relaxed">"{review.content}"</p>
              )}
              {review.responded && review.response ? (
                <div className="mt-3 pl-4 border-l-2 border-success/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">✓ Response:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(review.response || "");
                        setCopiedId(review.id);
                        toast.success("Response copied to clipboard");
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                    >
                      {copiedId === review.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === review.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">"{review.response}"</p>
                </div>
              ) : respondingId === review.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Write your response..."
                    className="text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => saveResponse(review.id)}>Save Response</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setRespondingId(null); setResponseText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  {review.rating < 4 && <span className="text-xs text-warning font-medium">⚠️ Needs response</span>}
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => generateAiResponse(review)} disabled={generatingId === review.id}>
                    {generatingId === review.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                    AI Generate
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setRespondingId(review.id); setResponseText(""); }}>
                    <MessageSquare className="w-3 h-3 mr-1" />Respond
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reputation;
