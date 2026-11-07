import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Search, Plus, Building2, Users, Brain, Sparkles, Loader2, ChevronRight,
  Globe, MapPin, TrendingUp, ExternalLink, Upload, Bookmark, Filter
} from "lucide-react";
import CompanyDetailPanel from "@/components/CompanyDetailPanel";
import CsvImportDialog from "@/components/CsvImportDialog";
import { BRAND } from "@/brand";
import { scrapeCompany } from "@/lib/scrapeCompany";

const PAGE_SIZE = 20;

interface Company {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  segment: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  employee_count: string | null;
  revenue_range: string | null;
  founded_year: number | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  ai_analysis: any;
  tags: string[] | null;
  created_at: string;
  client_id: string;
  is_bookmarked: boolean;
}

const industryColors: Record<string, string> = {
  Technology: "bg-blue-500/10 text-blue-600 border-blue-200",
  Healthcare: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Finance: "bg-amber-500/10 text-amber-600 border-amber-200",
  Manufacturing: "bg-slate-500/10 text-slate-600 border-slate-200",
  Retail: "bg-ember-500/10 text-ember-600 border-ember-200",
  Education: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  "Real Estate": "bg-orange-500/10 text-orange-600 border-orange-200",
};

const Companies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [industryFilter, setIndustryFilter] = useState("All");
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [industries, setIndustries] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [scrapedPages, setScrapedPages] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", website: "", industry: "", segment: "", description: "",
    phone: "", email: "", address: "", city: "", state: "", country: "",
    employee_count: "", revenue_range: "", founded_year: null as number | null,
    social_linkedin: "", social_twitter: "", social_facebook: "",
  });

  const resetForm = () => {
    setForm({
      name: "", website: "", industry: "", segment: "", description: "",
      phone: "", email: "", address: "", city: "", state: "", country: "",
      employee_count: "", revenue_range: "", founded_year: null,
      social_linkedin: "", social_twitter: "", social_facebook: "",
    });
    setScrapedPages([]);
  };

  const fetchCompanies = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setCompanies([]);
    } else {
      setLoadingMore(true);
    }

    const from = reset ? 0 : companies.length;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(`name.ilike.${q},industry.ilike.${q},domain.ilike.${q}`);
    }
    if (industryFilter !== "All") {
      query = query.eq("industry", industryFilter);
    }
    if (bookmarkFilter) {
      query = (query as any).eq("is_bookmarked", true);
    }

    const { data, count, error } = await query;
    if (error) { toast.error("Failed to load companies"); console.error(error); }

    const newCompanies = (data as any[]) || [];
    if (reset) {
      setCompanies(newCompanies);
    } else {
      setCompanies(prev => [...prev, ...newCompanies]);
    }
    setTotalCount(count || 0);
    setHasMore(from + newCompanies.length < (count || 0));
    setLoading(false);
    setLoadingMore(false);
  }, [search, companies.length, industryFilter, bookmarkFilter]);

  // Fetch distinct industries for filter
  const fetchIndustries = async () => {
    const { data } = await supabase.from("companies").select("industry").not("industry", "is", null);
    if (data) {
      const unique = [...new Set(data.map(d => d.industry).filter(Boolean))] as string[];
      setIndustries(unique.sort());
    }
  };

  useEffect(() => {
    fetchCompanies(true);
    fetchIndustries();
  }, []);

  // Re-fetch when filters change
  useEffect(() => { fetchCompanies(true); }, [industryFilter, bookmarkFilter]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCompanies(true);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const toggleBookmark = async (e: React.MouseEvent, company: Company) => {
    e.stopPropagation();
    const newValue = !company.is_bookmarked;
    // Optimistic update
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_bookmarked: newValue } : c));
    const { error } = await supabase
      .from("companies")
      .update({ is_bookmarked: newValue } as any)
      .eq("id", company.id);
    if (error) {
      toast.error("Failed to update bookmark");
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_bookmarked: !newValue } : c));
    }
  };

  const handleScrape = async () => {
    if (!form.website) { toast.error("Enter a website URL first"); return; }
    setScraping(true);
    try {
      const { info, pages } = await scrapeCompany(form.website);
      setScrapedPages(pages);
      setForm(f => ({
        ...f,
        name: info.name || f.name,
        industry: info.industry || f.industry,
        segment: info.segment || f.segment,
        description: info.description || f.description,
        phone: info.phone || f.phone,
        email: info.email || f.email,
        address: info.address || f.address,
        city: info.city || f.city,
        state: info.state || f.state,
        country: info.country || f.country,
        employee_count: info.employee_count || f.employee_count,
        revenue_range: info.revenue_range || f.revenue_range,
        founded_year: info.founded_year || f.founded_year,
        social_linkedin: info.social_linkedin || f.social_linkedin,
        social_twitter: info.social_twitter || f.social_twitter,
        social_facebook: info.social_facebook || f.social_facebook,
      }));
      toast.success(`Scraped ${pages.length} pages successfully!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to scrape company info");
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      // Auto-provision client if not linked yet
      const { data: ensureData, error: ensureError } = await supabase.rpc("ensure_user_client_id");
      console.log("ensure_user_client_id result:", ensureData, ensureError);
      if (ensureError || !ensureData) { toast.error(ensureError?.message || "Failed to set up your account. Please try again."); setSaving(false); return; }
      const clientId = ensureData;

      let url = form.website.trim();
      if (url && !url.startsWith("http")) url = `https://${url}`;
      const domain = url ? new URL(url).hostname : null;

      const insertData: any = {
        client_id: clientId, name: form.name, website: url || null, domain,
        industry: form.industry || null, segment: form.segment || null, description: form.description || null,
        phone: form.phone || null, email: form.email || null, city: form.city || null,
        ...(BRAND.features.addresses ? { address: form.address || null } : {}),
        state: form.state || null, country: form.country || null, employee_count: form.employee_count || null,
        revenue_range: form.revenue_range || null, founded_year: form.founded_year,
        social_linkedin: form.social_linkedin || null, social_twitter: form.social_twitter || null,
        social_facebook: form.social_facebook || null,
      };

      const { data: inserted, error } = await supabase.from("companies").insert(insertData).select("id").single();
      if (error) throw error;
      const companyId = inserted.id;

      // Save scraped pages to company_knowledge
      if (scrapedPages.length > 0) {
        const knowledgeRows = scrapedPages.map((p: any) => ({
          client_id: clientId,
          company_id: companyId,
          page_url: p.url,
          page_title: p.title || null,
          content: p.content,
          page_type: p.page_type || "general",
          content_type: "page",
        }));
        const { error: kErr } = await supabase.from("company_knowledge").insert(knowledgeRows);
        if (kErr) console.error("Failed to save scraped pages:", kErr);
        else console.log(`Saved ${knowledgeRows.length} pages to company_knowledge`);
      }

      toast.success("Company added successfully!");
      setShowAdd(false);
      resetForm();
      fetchCompanies(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to save company");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (company: Company) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-company", { body: { company } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: updateErr } = await supabase.from("companies").update({ ai_analysis: data.data }).eq("id", company.id);
      if (updateErr) throw updateErr;
      setSelectedCompany({ ...company, ai_analysis: data.data });
      toast.success("AI analysis complete!");
      fetchCompanies(true);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const hasScrapedData = form.name || form.industry || form.description;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount} {totalCount === 1 ? "company" : "companies"} in your CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCsvImport(true)} className="gap-2 shadow-sm">
            <Upload className="w-4 h-4" />CSV Import
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />Add Company
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, industry, or domain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border"
          />
        </div>
        <Button
          variant={bookmarkFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setBookmarkFilter(!bookmarkFilter)}
          className="gap-1.5"
        >
          <Bookmark className={cn("w-4 h-4", bookmarkFilter && "fill-current")} />
          Bookmarked
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filter
        </Button>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIndustryFilter("All")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
              industryFilter === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            All Industries
          </button>
          {industries.map(ind => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(ind)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                industryFilter === ind ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {ind}
            </button>
          ))}
        </motion.div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No companies yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Add a company and use AI to scrape their website for instant business intelligence
          </p>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Sparkles className="w-4 h-4" />Add Your First Company
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {companies.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card
                  className="group cursor-pointer border bg-card hover:shadow-md transition-all duration-200 overflow-hidden"
                  onClick={() => setSelectedCompany(c)}
                >
                  {/* Colored accent bar */}
                  <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/10">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-foreground truncate">{c.name}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => toggleBookmark(e, c)}
                              className="p-0.5 rounded hover:bg-muted transition-colors"
                              title={c.is_bookmarked ? "Remove bookmark" : "Bookmark"}
                            >
                              <Bookmark className={cn("w-3.5 h-3.5 transition-colors", c.is_bookmarked ? "fill-primary text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100")} />
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {c.domain && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3" />{c.domain}
                          </p>
                        )}
                      </div>
                    </div>

                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{c.description}</p>
                    )}

                    {/* Location */}
                    {(c.city || c.state || c.country) && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" />
                        {[c.city, c.state, c.country].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {c.industry && (
                        <Badge variant="outline" className={cn("text-[10px] font-medium", industryColors[c.industry] || "bg-secondary text-secondary-foreground")}>
                          {c.industry}
                        </Badge>
                      )}
                      {c.segment && (
                        <Badge variant="outline" className="text-[10px] bg-secondary/50 text-secondary-foreground border-border">
                          {c.segment}
                        </Badge>
                      )}
                      {c.employee_count && (
                        <Badge variant="outline" className="text-[10px] border-border">
                          <Users className="w-3 h-3 mr-1" />{c.employee_count}
                        </Badge>
                      )}
                      {c.revenue_range && (
                        <Badge variant="outline" className="text-[10px] border-border">
                          <TrendingUp className="w-3 h-3 mr-1" />{c.revenue_range}
                        </Badge>
                      )}
                      {c.ai_analysis && Object.keys(c.ai_analysis).length > 0 && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                          <Brain className="w-3 h-3 mr-1" />AI Analyzed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && companies.length > 0 && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchCompanies(false)}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {loadingMore ? "Loading..." : `Load More (${companies.length} of ${totalCount})`}
          </Button>
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Add Company
            </DialogTitle>
            <DialogDescription>Enter a website URL and let AI extract company details automatically</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Scrape Section */}
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02]">
              <Label className="text-xs font-medium text-primary mb-2 block">Website URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="bg-card"
                />
                <Button onClick={handleScrape} disabled={scraping} className="gap-2 shrink-0 min-w-[120px]">
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {scraping ? "Scraping..." : "Auto-fill"}
                </Button>
              </div>
              {scraping && (
                <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                  AI is scraping all pages including about, team, services, contact...
                </p>
              )}
              {!scraping && scrapedPages.length > 0 && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />{scrapedPages.length} pages scraped and ready for AI analysis
                </p>
              )}
            </div>

            {/* Scraped results or manual entry */}
            <div className={cn("space-y-4 transition-opacity", hasScrapedData ? "opacity-100" : "opacity-60")}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Company Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Industry</Label>
                  <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Segment</Label>
                  <Input value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Employees</Label>
                  <Input value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Revenue Range</Label>
                  <Input value={form.revenue_range} onChange={e => setForm(f => ({ ...f, revenue_range: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Founded Year</Label>
                  <Input type="number" value={form.founded_year || ""} onChange={e => setForm(f => ({ ...f, founded_year: e.target.value ? Number(e.target.value) : null }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-card" />
                </div>
                {BRAND.features.addresses && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-card" />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="bg-card" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="bg-card" />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-card resize-none" rows={2} />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-2 block">Social Links</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={form.social_linkedin} onChange={e => setForm(f => ({ ...f, social_linkedin: e.target.value }))} placeholder="LinkedIn URL" className="bg-card text-xs" />
                  <Input value={form.social_twitter} onChange={e => setForm(f => ({ ...f, social_twitter: e.target.value }))} placeholder="Twitter URL" className="bg-card text-xs" />
                  <Input value={form.social_facebook} onChange={e => setForm(f => ({ ...f, social_facebook: e.target.value }))} placeholder="Facebook URL" className="bg-card text-xs" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <CompanyDetailPanel
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
        onSaved={() => { fetchCompanies(true); }}
      />
      {/* CSV Import */}
      <CsvImportDialog open={showCsvImport} onOpenChange={setShowCsvImport} onImported={() => fetchCompanies(true)} />
    </div>
  );
};

export default Companies;
