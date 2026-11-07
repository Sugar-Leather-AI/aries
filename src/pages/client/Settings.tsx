import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, Plus, Save, ExternalLink, Globe, Loader2, Mail, Trash2, Phone, X, Send, UserPlus, CreditCard, Eye, EyeOff, CheckCircle2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WhatsAppChannels } from "@/components/WhatsAppChannels";
import { InvoiceSettingsForm } from "@/components/payments/InvoiceSettingsForm";
import { StripeSettingsForm } from "@/components/payments/StripeSettingsForm";
import BillingSettings from "@/components/billing/BillingSettings";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { BRAND } from "@/brand";

const tabs = ["Business Profile", "Channels", "Payments", "Team", "Notifications", "Billing", "API"];

interface TeamMember {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending";
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  created_at: string;
}

const notificationTypes = [
  { event: "New lead captured", email: true, sms: true, inApp: true },
  { event: "Appointment booked", email: true, sms: false, inApp: true },
  { event: "No-show occurred", email: true, sms: true, inApp: true },
  { event: "Invoice paid", email: false, sms: false, inApp: true },
  { event: "New review", email: true, sms: false, inApp: true },
  { event: "Negative review", email: true, sms: true, inApp: true },
  { event: "Agent error", email: true, sms: false, inApp: true },
];

const businessHours = [
  { day: "Monday", open: "9:00 AM", close: "5:00 PM", closed: false },
  { day: "Tuesday", open: "9:00 AM", close: "5:00 PM", closed: false },
  { day: "Wednesday", open: "9:00 AM", close: "5:00 PM", closed: false },
  { day: "Thursday", open: "9:00 AM", close: "5:00 PM", closed: false },
  { day: "Friday", open: "9:00 AM", close: "5:00 PM", closed: false },
  { day: "Saturday", open: "10:00 AM", close: "2:00 PM", closed: false },
  { day: "Sunday", open: "", close: "", closed: true },
];

// Provider direction capabilities
const providerDirections: Record<string, { inbound: boolean; outbound: boolean }> = {
  // Email
  resend:   { inbound: true,  outbound: true },
  gmail:    { inbound: true,  outbound: true },
  icloud:   { inbound: true,  outbound: true },
  smtp:     { inbound: false, outbound: true },
  sendgrid: { inbound: false, outbound: true },
  mailgun:  { inbound: false, outbound: true },
  // SMS
  telnyx:   { inbound: true,  outbound: true },
  twilio:   { inbound: true,  outbound: true },
  plivo:    { inbound: true,  outbound: true },
  vonage:   { inbound: true,  outbound: true },
};

const DirectionBadge = ({ provider }: { provider: string }) => {
  const dir = providerDirections[provider] || { inbound: false, outbound: true };
  if (dir.inbound && dir.outbound) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
        <ArrowDownLeft className="w-3 h-3" /><ArrowUpRight className="w-3 h-3 -ml-1.5" /> Inbound + Outbound
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600">
      <ArrowUpRight className="w-3 h-3" /> Outbound only
    </span>
  );
};

const ClientSettings = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab");
    return t && tabs.includes(t) ? t : "Business Profile";
  });
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ pages: number } | null>(null);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Square settings state
  const [squareAppId, setSquareAppId] = useState("");
  const [squareAccessToken, setSquareAccessToken] = useState("");
  const [squareLocationId, setSquareLocationId] = useState("");
  const [squareEnvironment, setSquareEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [savingSquare, setSavingSquare] = useState(false);
  const [testingSquare, setTestingSquare] = useState(false);
  const [squareConnected, setSquareConnected] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Channel accounts state
  interface ChannelAccount {
    id: string;
    channel: string;
    identifier: string;
    provider: string;
    is_active: boolean;
    config?: Record<string, any>;
  }
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccount[]>([]);
  const [newChannelType, setNewChannelType] = useState<"sms" | "email">("sms");
  const [newIdentifier, setNewIdentifier] = useState("");
  const [newProvider, setNewProvider] = useState("telnyx");
  const [savingChannel, setSavingChannel] = useState(false);

  // SMTP / email provider config state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  // API-based provider config
  const [emailApiKey, setEmailApiKey] = useState("");
  const [mailgunDomain, setMailgunDomain] = useState("");
  const [mailgunRegion, setMailgunRegion] = useState("us");
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailMode, setGmailMode] = useState<"oauth" | "smtp">("oauth");

  useEffect(() => {
    if (user?.clientId) {
      loadClient();
      loadChannelAccounts();
      loadTeam();
    }
  }, [user?.clientId]);

  const loadClient = async () => {
    const { data } = await supabase
      .from("clients")
      .select("business_name, owner_name, email, phone, google_place_id, website, logo_url, square_app_id, square_access_token, square_location_id, square_environment")
      .eq("id", user!.clientId!)
      .single() as { data: any };
    if (data) {
      setBusinessName(data.business_name || "");
      setOwnerName(data.owner_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setGooglePlaceId(data.google_place_id || "");
      setWebsite(data.website || "");
      setLogoUrl(data.logo_url || null);
      setSquareAppId(data.square_app_id || "");
      setSquareAccessToken(data.square_access_token || "");
      setSquareLocationId(data.square_location_id || "");
      setSquareEnvironment(data.square_environment || "sandbox");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.clientId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.clientId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("clients")
        .update({ logo_url: publicUrl } as any)
        .eq("id", user.clientId);
      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!user?.clientId) return;
    setUploadingLogo(true);
    try {
      await supabase
        .from("clients")
        .update({ logo_url: null } as any)
        .eq("id", user.clientId);
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const loadTeam = async () => {
    if (!user?.clientId) return;

    // Load active team members from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("client_id", user.clientId);

    const members: TeamMember[] = (profiles || []).map((p: any) => ({
      name: p.full_name,
      email: p.email,
      role: p.email === user.email ? "Owner" : "Staff",
      status: "Active" as const,
    }));
    setTeamMembers(members);

    // Load pending invites
    const { data: invites } = await supabase
      .from("team_invites")
      .select("id, email, role, accepted_at, created_at")
      .eq("client_id", user.clientId)
      .order("created_at", { ascending: false });
    setTeamInvites((invites as TeamInvite[]) || []);
  };

  const sendInvite = async () => {
    if (!user?.clientId || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const { error } = await supabase.from("team_invites").insert({
        client_id: user.clientId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.id,
      } as any);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("This email has already been invited");
        } else {
          throw error;
        }
      } else {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setShowInvite(false);
        setInviteEmail("");
        setInviteRole("Staff");
        loadTeam();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from("team_invites").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove invite");
    } else {
      toast.success("Invite removed");
      loadTeam();
    }
  };

  const saveProfile = async () => {
    if (!user?.clientId) return;
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        business_name: businessName,
        owner_name: ownerName,
        email,
        phone,
        google_place_id: googlePlaceId,
        website,
      } as any)
      .eq("id", user.clientId);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved!");
    }
    setSaving(false);
  };

  const saveSquareSettings = async () => {
    if (!user?.clientId) return;
    setSavingSquare(true);
    const { error } = await supabase
      .from("clients")
      .update({
        square_app_id: squareAppId || null,
        square_access_token: squareAccessToken || null,
        square_location_id: squareLocationId || null,
        square_environment: squareEnvironment,
      } as any)
      .eq("id", user.clientId);
    if (error) {
      toast.error("Failed to save Square settings");
    } else {
      toast.success("Square settings saved!");
    }
    setSavingSquare(false);
  };

  const testSquareConnection = async () => {
    if (!user?.clientId) return;
    setTestingSquare(true);
    setSquareConnected(null);
    try {
      // Save first so edge function reads latest credentials
      await supabase
        .from("clients")
        .update({
          square_app_id: squareAppId || null,
          square_access_token: squareAccessToken || null,
          square_location_id: squareLocationId || null,
          square_environment: squareEnvironment,
        } as any)
        .eq("id", user.clientId);

      const { data, error } = await supabase.functions.invoke("square-test-connection", {
        body: { client_id: user.clientId },
      });
      if (error) throw error;
      if (data.success) {
        setSquareConnected(data.location_name);
        toast.success(`Connected to ${data.location_name}`);
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test connection");
    } finally {
      setTestingSquare(false);
    }
  };

  const loadChannelAccounts = async () => {
    if (!user?.clientId) return;
    const { data } = await supabase
      .from("channel_accounts")
      .select("id, channel, identifier, provider, is_active, config")
      .eq("client_id", user.clientId)
      .order("created_at", { ascending: true });
    setChannelAccounts((data as any) || []);
  };

  const addChannelAccount = async () => {
    if (!user?.clientId || !newIdentifier.trim()) return;
    setSavingChannel(true);

    // Build provider-specific config
    let config: Record<string, any> = {};
    let provider = newProvider;

    if (newChannelType === "email") {
      provider = newProvider; // resend, gmail, smtp, sendgrid, mailgun
      if (provider === "smtp" || provider === "gmail" || provider === "icloud") {
        if (!smtpUsername || !smtpPassword) {
          toast.error("Username and password are required.");
          setSavingChannel(false);
          return;
        }
        if (provider === "icloud" && !/@(icloud|me|mac)\.com$/i.test(smtpUsername.trim())) {
          toast.error("Apple ID must be an @icloud.com, @me.com, or @mac.com address — not a Gmail or custom domain address.");
          setSavingChannel(false);
          return;
        }
        config = {
          host: provider === "gmail" ? "smtp.gmail.com" : provider === "icloud" ? "smtp.mail.me.com" : smtpHost,
          port: provider === "icloud" ? 587 : parseInt(smtpPort) || 465,
          secure: provider === "icloud" ? false : smtpSecure,
          username: smtpUsername,
          password: smtpPassword,
        };
      } else if (provider === "sendgrid") {
        if (!emailApiKey) { toast.error("API key is required."); setSavingChannel(false); return; }
        config = { api_key: emailApiKey };
      } else if (provider === "mailgun") {
        if (!emailApiKey || !mailgunDomain) { toast.error("API key and domain are required."); setSavingChannel(false); return; }
        config = { api_key: emailApiKey, domain: mailgunDomain, region: mailgunRegion };
      } else if (provider === "resend") {
        if (emailApiKey) config = { api_key: emailApiKey };
      }
    }

    const { error } = await supabase.from("channel_accounts").insert({
      client_id: user.clientId,
      channel: newChannelType,
      identifier: newIdentifier.trim(),
      provider,
      is_active: true,
      config,
    } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "This number/address is already registered." : "Failed to add channel.");
    } else {
      toast.success("Channel added!");
      setNewIdentifier("");
      setSmtpHost(""); setSmtpPort("465"); setSmtpUsername(""); setSmtpPassword("");
      setEmailApiKey(""); setMailgunDomain(""); setMailgunRegion("us");
      loadChannelAccounts();
    }
    setSavingChannel(false);
  };

  const deleteChannelAccount = async (id: string) => {
    const { error } = await supabase.from("channel_accounts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove channel.");
    } else {
      toast.success("Channel removed.");
      loadChannelAccounts();
    }
  };

  const handleGmailOAuth = async () => {
    if (!user?.clientId) return;
    setGmailConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/settings?tab=Channels`;
      const { data, error } = await supabase.functions.invoke("gmail-auth", {
        body: { client_id: user.clientId, redirect_uri: redirectUri },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      window.location.href = data.auth_url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Gmail OAuth");
      setGmailConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
              activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Business Profile" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl space-y-6">
          <div>
            <Label>Business Logo</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="mt-2 flex items-center gap-3">
              <div
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                className={cn(
                  "w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden",
                  uploadingLogo && "opacity-50 pointer-events-none"
                )}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Business logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="w-3 h-3 mr-1" />{logoUrl ? "Change" : "Upload"}
                </Button>
                {logoUrl && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={removeLogo} disabled={uploadingLogo}>
                    <Trash2 className="w-3 h-3 mr-1" />Remove
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG. Max 2MB.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Business Name</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Owner Name</Label><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1.5" /></div>
          </div>

          {/* Google Reviews Integration */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-base font-semibold">Google Reviews Integration</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Connect your Google Business listing to sync reviews automatically.
              Find your Place ID at{" "}
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Google's Place ID Finder <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <div>
              <Label>Google Place ID</Label>
              <Input
                value={googlePlaceId}
                onChange={e => setGooglePlaceId(e.target.value)}
                placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
          </div>

          {/* Company Website for AI Knowledge */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <Label className="text-base font-semibold">Company Website (AI Knowledge Base)</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Enter your company website URL. We'll scrape all pages to build a knowledge base so your AI chat widget can answer visitor questions about your business.
            </p>
            <div className="flex gap-2">
              <Input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://www.yourcompany.com"
                className="flex-1"
              />
              <Button
                variant="outline"
                disabled={!website.trim() || scraping}
                onClick={async () => {
                  if (!user?.clientId || !website.trim()) return;
                  setScraping(true);
                  setScrapeResult(null);
                  try {
                    // Start async scrape
                    const { data: startData, error: startError } = await supabase.functions.invoke("scrape-website", {
                      body: { website: website.trim(), client_id: user.clientId },
                    });
                    if (startError) throw startError;
                    const runId = startData.runId;
                    if (!runId) throw new Error("Failed to start scrape");

                    // Poll for completion
                    let attempts = 0;
                    const maxAttempts = 60; // 5 minutes max
                    while (attempts < maxAttempts) {
                      await new Promise(r => setTimeout(r, 5000));
                      attempts++;
                      const { data: pollData, error: pollError } = await supabase.functions.invoke("scrape-website", {
                        body: { runId, client_id: user.clientId },
                      });
                      if (pollError) throw pollError;
                      if (pollData.status === "done") {
                        setScrapeResult({ pages: pollData.pages_scraped || 0 });
                        toast.success(`Scraped ${pollData.pages_scraped} pages successfully!`);
                        return;
                      }
                      if (pollData.status === "failed") {
                        throw new Error(pollData.error || "Scrape failed");
                      }
                      // Still running — continue polling
                    }
                    throw new Error("Scrape timed out — please try again");
                  } catch (e: any) {
                    toast.error(e.message || "Failed to scrape website");
                  } finally {
                    setScraping(false);
                  }
                }}
              >
                {scraping ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scraping...</> : <><Globe className="w-4 h-4 mr-1" />Scrape Site</>}
              </Button>
            </div>
            {scrapeResult && (
              <p className="text-xs text-success mt-2">{scrapeResult.pages} pages scraped and saved to knowledge base.</p>
            )}
          </div>

          <div>
            <Label>Timezone</Label>
            <select className="w-full mt-1.5 h-10 rounded-md border px-3 text-sm bg-card text-foreground">
              <option>America/New_York (EST)</option><option>America/Chicago (CST)</option><option>America/Los_Angeles (PST)</option>
            </select>
          </div>
          <div>
            <Label>Business Hours</Label>
            <div className="mt-2 space-y-2">
              {businessHours.map(h => (
                <div key={h.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-foreground font-medium">{h.day}</span>
                  <Switch checked={!h.closed} />
                  {!h.closed ? (
                    <><Input defaultValue={h.open} className="w-28 h-8" /><span className="text-muted-foreground">to</span><Input defaultValue={h.close} className="w-28 h-8" /></>
                  ) : (
                    <span className="text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      )}

      {activeTab === "Channels" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-1">SMS & Email Channels</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configure the phone numbers and email addresses used to send and receive messages for your business.
              Inbound messages to these numbers/addresses will appear in your Inbox.
            </p>
          </div>

          {/* Existing accounts */}
          {channelAccounts.some(a => a.channel !== "whatsapp") && (
            <div className="space-y-2">
              {channelAccounts.filter(a => a.channel !== "whatsapp").map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    acc.channel === "sms" ? "bg-blue-500/10 text-blue-500" : "bg-ember-500/10 text-ember-500")}>
                    {acc.channel === "sms" ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{acc.identifier}</span>
                      <DirectionBadge provider={acc.provider} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {acc.channel.toUpperCase()} · {acc.provider === "gmail" ? "Gmail" : acc.provider === "icloud" ? "iCloud" : acc.provider === "smtp" ? `SMTP${acc.config?.host ? ` (${acc.config.host})` : ""}` : acc.provider === "telnyx" || acc.provider === "resend" ? BRAND.name : acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)} · {acc.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    onClick={() => deleteChannelAccount(acc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!channelAccounts.some(a => a.channel !== "whatsapp") && (
            <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
              No channels configured yet. Add your {BRAND.name} number or {BRAND.name} email below.
            </div>
          )}

          {/* Add new channel */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Add Channel</Label>
            <div className="flex gap-2">
              <select value={newChannelType} onChange={e => {
                setNewChannelType(e.target.value as "sms" | "email");
                setNewProvider(e.target.value === "sms" ? "telnyx" : "resend");
              }}
                className="h-10 rounded-md border px-3 text-sm bg-card text-foreground w-28">
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              {newChannelType === "sms" && (
                <select value={newProvider} onChange={e => setNewProvider(e.target.value)}
                  className="h-10 rounded-md border px-3 text-sm bg-card text-foreground w-28">
                  <option value="telnyx">{BRAND.name}</option>
                  <option value="twilio">Twilio</option>
                  <option value="plivo">Plivo</option>
                  <option value="vonage">Vonage</option>
                </select>
              )}
              {newChannelType === "email" && (
                <select value={newProvider} onChange={e => setNewProvider(e.target.value)}
                  className="h-10 rounded-md border px-3 text-sm bg-card text-foreground w-28">
                  <option value="resend">{BRAND.name}</option>
                  <option value="gmail">Gmail</option>
                  <option value="icloud">iCloud</option>
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              )}
              <Input
                value={newIdentifier}
                onChange={e => setNewIdentifier(e.target.value)}
                placeholder={newChannelType === "sms" ? "+1234567890 (E.164 format)"
                  : newProvider === "gmail" ? "yourname@gmail.com"
                  : newProvider === "icloud" ? "yourname@icloud.com"
                  : "inbox@yourdomain.com"}
                className="flex-1"
              />
            </div>
            <DirectionBadge provider={newProvider} />

            {/* SMTP / Gmail config fields */}
            {newChannelType === "email" && newProvider === "gmail" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">Gmail Connection Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGmailMode("oauth")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left text-xs transition-colors",
                      gmailMode === "oauth"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium mb-0.5">OAuth (Recommended)</div>
                    <div className="opacity-75">Inbound + Outbound · Secure sign-in</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGmailMode("smtp")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left text-xs transition-colors",
                      gmailMode === "smtp"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium mb-0.5">App Password</div>
                    <div className="opacity-75">Outbound only · Manual setup</div>
                  </button>
                </div>

                {gmailMode === "oauth" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Sign in with Google to enable both sending and receiving emails from your Gmail inbox.
                      Your Gmail address will be auto-detected after sign-in.
                    </p>
                    <Button
                      onClick={handleGmailOAuth}
                      disabled={gmailConnecting}
                      className="w-full"
                      variant="outline"
                    >
                      {gmailConnecting
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      }
                      {gmailConnecting ? "Redirecting to Google..." : "Connect Gmail with Google"}
                    </Button>
                  </div>
                )}

                {gmailMode === "smtp" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground -mt-1">
                      Use a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Google App Password <ExternalLink className="w-3 h-3" /></a> — regular passwords won't work with 2FA enabled.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Gmail Address</Label>
                        <Input value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)}
                          placeholder="yourname@gmail.com" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">App Password</Label>
                        <div className="relative mt-1">
                          <Input type={showSmtpPassword ? "text" : "password"} value={smtpPassword}
                            onChange={e => setSmtpPassword(e.target.value)} placeholder="••••••••••" className="pr-10" />
                          <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {newChannelType === "email" && newProvider === "icloud" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">iCloud Mail Settings</p>
                <p className="text-xs text-muted-foreground -mt-1">
                  Use an <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Apple App-Specific Password <ExternalLink className="w-3 h-3" /></a> — your regular Apple ID password won't work.
                  {" "}Custom domain users: enter your <strong>@icloud.com Apple ID</strong> below, not your custom domain address.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Apple ID <span className="text-muted-foreground/60">(yourname@icloud.com)</span></Label>
                    <Input value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)}
                      placeholder="yourname@icloud.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">App-Specific Password</Label>
                    <div className="relative mt-1">
                      <Input type={showSmtpPassword ? "text" : "password"} value={smtpPassword}
                        onChange={e => setSmtpPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" className="pr-10" />
                      <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {newChannelType === "email" && newProvider === "smtp" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">SMTP Server Settings</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">SMTP Host</Label>
                    <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Port</Label>
                    <select value={smtpPort} onChange={e => {
                      setSmtpPort(e.target.value);
                      setSmtpSecure(e.target.value === "465");
                    }} className="w-full mt-1 h-9 rounded-md border px-3 text-sm bg-card text-foreground">
                      <option value="465">465 (SSL)</option>
                      <option value="587">587 (TLS)</option>
                      <option value="2525">2525 (Alt)</option>
                      <option value="2587">2587 (AWS SES)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <Input value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)}
                      placeholder="user@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <div className="relative mt-1">
                      <Input type={showSmtpPassword ? "text" : "password"} value={smtpPassword}
                        onChange={e => setSmtpPassword(e.target.value)} placeholder="••••••••••" className="pr-10" />
                      <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SendGrid config */}
            {newChannelType === "email" && newProvider === "sendgrid" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">SendGrid Settings</p>
                <div>
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <div className="relative mt-1">
                    <Input type={showSmtpPassword ? "text" : "password"} value={emailApiKey}
                      onChange={e => setEmailApiKey(e.target.value)} placeholder="SG.xxxx..." className="pr-10" />
                    <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mailgun config */}
            {newChannelType === "email" && newProvider === "mailgun" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">Mailgun Settings</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">API Key</Label>
                    <div className="relative mt-1">
                      <Input type={showSmtpPassword ? "text" : "password"} value={emailApiKey}
                        onChange={e => setEmailApiKey(e.target.value)} placeholder="key-xxxx..." className="pr-10" />
                      <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Domain</Label>
                    <Input value={mailgunDomain} onChange={e => setMailgunDomain(e.target.value)}
                      placeholder="mg.yourdomain.com" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Region</Label>
                  <select value={mailgunRegion} onChange={e => setMailgunRegion(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border px-3 text-sm bg-card text-foreground">
                    <option value="us">US</option>
                    <option value="eu">EU</option>
                  </select>
                </div>
              </div>
            )}

            {/* Resend API key override (optional) */}
            {newChannelType === "email" && newProvider === "resend" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <p className="text-xs font-medium text-foreground">{BRAND.name} Email Settings</p>
                <div>
                  <Label className="text-xs text-muted-foreground">API Key (optional — uses platform default if empty)</Label>
                  <div className="relative mt-1">
                    <Input type={showSmtpPassword ? "text" : "password"} value={emailApiKey}
                      onChange={e => setEmailApiKey(e.target.value)} placeholder="re_xxxx..." className="pr-10" />
                    <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!(newChannelType === "email" && newProvider === "gmail" && gmailMode === "oauth") && (
              <Button onClick={addChannelAccount} disabled={savingChannel || !newIdentifier.trim()} className="w-full">
                {savingChannel ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Add Email Channel
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              {newChannelType === "sms"
                ? "Enter your phone number in E.164 format (e.g. +12125551234). Make sure the number is purchased and assigned to a messaging profile with the webhook URL configured."
                : newProvider === "gmail" && gmailMode === "oauth"
                ? "Click 'Connect Gmail with Google' to authorise access. Your Gmail address is detected automatically and emails sent to your inbox will be received here."
                : newProvider === "gmail"
                ? "Enter your Gmail address above and create an App Password. Emails will be sent from your Gmail account (outbound only)."
                : newProvider === "icloud"
                ? "Enter your iCloud address and an App-Specific Password from appleid.apple.com. Emails will be sent and received from your iCloud inbox automatically."
                : newProvider === "smtp"
                ? "Enter your SMTP server details. Common ports: 465 (SSL), 587 (TLS). Note: ports 25 and 587 may be restricted on some platforms."
                : newProvider === "sendgrid"
                ? "Enter your SendGrid API key. Get one from the SendGrid dashboard under Settings > API Keys."
                : newProvider === "mailgun"
                ? "Enter your Mailgun private API key and verified sending domain."
                : "Enter the email address configured for inbound forwarding. API key is optional if the platform default is set."}
            </p>
          </div>

        </motion.div>
      )}

      {activeTab === "Channels" && user?.clientId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl mt-6">
          <WhatsAppChannels clientId={user.clientId} />
        </motion.div>
      )}

      {activeTab === "Payments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-base">Square Payments Integration</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect your Square account to create payment links and track invoices.
              Get your credentials from the{" "}
              <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Square Developer Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div>
            <Label>Environment</Label>
            <select
              value={squareEnvironment}
              onChange={e => setSquareEnvironment(e.target.value as "sandbox" | "production")}
              className="w-full mt-1.5 h-10 rounded-md border px-3 text-sm bg-card text-foreground"
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Use Sandbox to test payments without real charges. Switch to Production when ready.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Application ID</Label>
              <Input
                value={squareAppId}
                onChange={e => setSquareAppId(e.target.value)}
                placeholder={squareEnvironment === "sandbox" ? "sandbox-sq0idb-..." : "sq0idb-..."}
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div>
              <Label>Access Token</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showToken ? "text" : "password"}
                  value={squareAccessToken}
                  onChange={e => setSquareAccessToken(e.target.value)}
                  placeholder={squareEnvironment === "sandbox" ? "EAAAl..." : "EAAAl..."}
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Location ID</Label>
              <Input
                value={squareLocationId}
                onChange={e => setSquareLocationId(e.target.value)}
                placeholder="L..."
                className="mt-1.5 font-mono text-sm"
              />
            </div>
          </div>

          {squareConnected && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Connected to: <span className="font-medium">{squareConnected}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={saveSquareSettings} disabled={savingSquare}>
              <Save className="w-4 h-4 mr-1" />{savingSquare ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              variant="outline"
              onClick={testSquareConnection}
              disabled={testingSquare || !squareAccessToken || !squareLocationId}
            >
              {testingSquare ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Testing...</> : "Test Connection"}
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "Payments" && user?.clientId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl mt-6">
          <StripeSettingsForm clientId={user.clientId} />
        </motion.div>
      )}

      {activeTab === "Payments" && user?.clientId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-2xl mt-6">
          <InvoiceSettingsForm clientId={user.clientId} />
        </motion.div>
      )}

      {activeTab === "Team" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-1" />Invite Team Member
          </Button>
          <div className="stat-card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground"></th>
              </tr></thead>
              <tbody>
                {teamMembers.map(m => (
                  <tr key={m.email} className="border-b">
                    <td className="p-3 font-medium text-foreground">{m.name}</td>
                    <td className="p-3 text-muted-foreground">{m.email}</td>
                    <td className="p-3"><span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">{m.role}</span></td>
                    <td className="p-3"><span className="bg-success/10 text-success px-2 py-0.5 rounded-full text-xs">{m.status}</span></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
                {teamInvites.filter(i => !i.accepted_at).map(inv => (
                  <tr key={inv.id} className="border-b bg-muted/20">
                    <td className="p-3 text-muted-foreground italic">—</td>
                    <td className="p-3 text-muted-foreground">{inv.email}</td>
                    <td className="p-3"><span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">{inv.role}</span></td>
                    <td className="p-3"><span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-xs">Pending</span></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInvite(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && teamInvites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                      No team members yet. Invite someone to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Invite Dialog */}
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Invite Team Member
                </DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team. They'll receive an email to create their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Email Address *</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-input bg-card px-3 text-sm"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>Cancel</Button>
                <Button onClick={sendInvite} disabled={sendingInvite || !inviteEmail.trim()}>
                  {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  {sendingInvite ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}

      {activeTab === "Notifications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Event</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-center p-3 font-medium text-muted-foreground">SMS</th>
              <th className="text-center p-3 font-medium text-muted-foreground">In-App</th>
            </tr></thead>
            <tbody>
              {notificationTypes.map(n => (
                <tr key={n.event} className="border-b">
                  <td className="p-3 text-foreground">{n.event}</td>
                  <td className="p-3 text-center"><Switch checked={n.email} /></td>
                  <td className="p-3 text-center"><Switch checked={n.sms} /></td>
                  <td className="p-3 text-center"><Switch checked={n.inApp} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {activeTab === "Billing" && user?.clientId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BillingSettings clientId={user.clientId} />
        </motion.div>
      )}

      {activeTab === "API" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card max-w-lg space-y-4">
          <div>
            <Label>API Key</Label>
            <Input defaultValue="sk-aria-xxxxx-xxxxx-xxxxx" readOnly className="mt-1.5 font-mono text-sm" />
          </div>
          <div>
            <Label>Webhook URL</Label>
            <Input placeholder="https://your-app.com/webhook" className="mt-1.5" />
          </div>
          <Button onClick={() => toast.success("API settings saved!")}><Save className="w-4 h-4 mr-1" />Save</Button>
        </motion.div>
      )}
    </div>
  );
};

export default ClientSettings;
