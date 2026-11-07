import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AtSign, Clock, Facebook, Instagram, Linkedin, Loader2, Music2, Plus, Send, Twitter, Unlink } from "lucide-react";

export interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  active: boolean;
}

export const SOCIAL_PLATFORM_INFO: Record<string, { label: string; icon: typeof Linkedin; color: string }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-500" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
  twitter: { label: "X (Twitter)", icon: Twitter, color: "text-foreground" },
  threads: { label: "Threads", icon: AtSign, color: "text-foreground" },
  tiktok: { label: "TikTok", icon: Music2, color: "text-foreground" },
};

async function fnError(data: any, error: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  const body = await error.context?.json?.().catch(() => null);
  return body?.error || error.message;
}

export async function loadSocialAccounts(clientId: string): Promise<SocialAccount[]> {
  const { data, error } = await supabase.functions.invoke("social-accounts", { body: { action: "list", client_id: clientId } });
  const message = await fnError(data, error);
  if (message) throw new Error(message);
  return data.accounts || [];
}

const accountLabel = (a: SocialAccount) => a.name || (a.username ? `@${a.username}` : SOCIAL_PLATFORM_INFO[a.platform]?.label || a.platform);

/** Connect and disconnect the business's social accounts (through Zernio). */
interface SocialSettings { auto_post?: boolean; timezone?: string; default_accounts?: Record<string, string> }

/** Asks the server to schedule newly approved posts and cancel reverted or edited ones. */
export async function syncAutoPost(clientId: string): Promise<void> {
  await supabase.functions.invoke("social-autopost", { body: { client_id: clientId } }).catch(() => {});
}

export function SocialAccountsDialog({ open, onOpenChange, clientId, accounts, onChanged }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  accounts: SocialAccount[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<SocialSettings>({});
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!open) return;
    (supabase.from("clients").select("social_settings").eq("id", clientId).single() as unknown as Promise<{ data: any }>)
      .then(({ data }) => setPrefs(data?.social_settings || {}));
  }, [open, clientId]);

  const savePrefs = async (patch: SocialSettings) => {
    const next = { ...prefs, ...patch, timezone: patch.timezone || prefs.timezone || browserTz };
    setPrefs(next);
    const { error } = await supabase.from("clients").update({ social_settings: next } as any).eq("id", clientId);
    if (error) { toast.error("Couldn't save"); return; }
    if ("auto_post" in patch) toast.success(patch.auto_post ? "Approved posts will go out automatically" : "Auto-posting is off");
    await syncAutoPost(clientId);
    onChanged();
  };
  const multi = Object.keys(SOCIAL_PLATFORM_INFO).filter(p => accounts.filter(a => a.platform === p).length > 1);

  const connect = async (platform: string) => {
    setBusy(platform);
    const { data, error } = await supabase.functions.invoke("social-accounts", {
      body: { action: "connect", client_id: clientId, platform, redirect_url: `${window.location.origin}${window.location.pathname}?social=connected` },
    });
    const message = await fnError(data, error);
    if (message) { toast.error(message); setBusy(null); return; }
    window.location.href = data.auth_url;
  };

  const disconnect = async (a: SocialAccount) => {
    if (!confirm(`Disconnect ${accountLabel(a)}? You can connect it again any time.`)) return;
    setBusy(a.id);
    const { data, error } = await supabase.functions.invoke("social-accounts", {
      body: { action: "disconnect", client_id: clientId, account_id: a.id },
    });
    const message = await fnError(data, error);
    setBusy(null);
    if (message) { toast.error(message); return; }
    toast.success("Disconnected");
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Social accounts</DialogTitle>
          <DialogDescription>Connect the accounts you want to publish to. You'll sign in on each network's own page.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {accounts.length > 0 && (
            <div className="divide-y rounded-lg border">
              {accounts.map(a => {
                const info = SOCIAL_PLATFORM_INFO[a.platform];
                const Icon = info?.icon || AtSign;
                return (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                    {a.avatar
                      ? <img src={a.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      : <Icon className={`w-5 h-5 ${info?.color || ""}`} />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{accountLabel(a)}</div>
                      <div className="text-[11px] text-muted-foreground">{info?.label || a.platform}{!a.active && " · needs reconnecting"}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => disconnect(a)} disabled={busy !== null} title="Disconnect">
                      {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {accounts.length > 0 && (
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <span>
                  <span className="text-sm font-medium block">Auto-post approved content</span>
                  <span className="text-[11px] text-muted-foreground">
                    Approved posts go out on their day: LinkedIn 8:30am, X 9am, Facebook 12:30pm, Instagram 6:30pm
                    ({(prefs.timezone || browserTz).replace(/_/g, " ")} time). Moving a post back to draft or editing it cancels its slot.
                  </span>
                </span>
                <Switch checked={!!prefs.auto_post} onCheckedChange={(v) => savePrefs({ auto_post: v })} />
              </label>
              {prefs.timezone && prefs.timezone !== browserTz && (
                <button type="button" className="text-[11px] underline text-muted-foreground" onClick={() => savePrefs({ timezone: browserTz })}>
                  Use my time zone ({browserTz.replace(/_/g, " ")})
                </button>
              )}
              {multi.map(p => (
                <div key={p}>
                  <Label className="text-xs text-muted-foreground">Post {SOCIAL_PLATFORM_INFO[p].label} to</Label>
                  <select value={prefs.default_accounts?.[p] || ""} onChange={e => savePrefs({ default_accounts: { ...(prefs.default_accounts || {}), [p]: e.target.value } })}
                    className="w-full mt-1 h-8 rounded-md border border-input bg-card px-2 text-sm">
                    <option value="">First connected</option>
                    {accounts.filter(a => a.platform === p).map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Connect</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {Object.entries(SOCIAL_PLATFORM_INFO).map(([id, info]) => (
                <Button key={id} variant="outline" size="sm" className="justify-start gap-2" onClick={() => connect(id)} disabled={busy !== null}>
                  {busy === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <info.icon className={`w-3.5 h-3.5 ${info.color}`} />}
                  {info.label}
                  <Plus className="w-3 h-3 ml-auto text-muted-foreground" />
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Instagram needs a Business or Creator account linked to a Facebook Page. Facebook posts go to a Page you manage.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Publish one approved post now, or schedule it. */
export function PublishPostDialog({ open, onOpenChange, clientId, item, accounts, onDone, defaultMediaUrl = "" }: {
  defaultMediaUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  item: { id: string; platform: string; title: string } | null;
  accounts: SocialAccount[];
  onDone: (result: { published?: boolean; published_url?: string | null; published_at?: string; scheduled?: boolean; scheduled_for?: string }) => void;
}) {
  const matching = item ? accounts.filter(a => a.platform === item.platform) : [];
  const [accountId, setAccountId] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setMediaUrl(defaultMediaUrl); }, [open, defaultMediaUrl]);
  const chosen = matching.find(a => a.id === accountId) || matching[0];
  const needsImage = chosen?.platform === "instagram";

  const submit = async () => {
    if (!item || !chosen) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-publish", {
      body: {
        client_id: clientId,
        content_id: item.id,
        account_id: chosen.id,
        media_url: mediaUrl.trim() || null,
        scheduled_for: when === "later" && at ? new Date(at).toISOString() : null,
      },
    });
    const message = await fnError(data, error);
    setBusy(false);
    if (message) { toast.error(message); return; }
    toast.success(data.scheduled ? `Scheduled for ${new Date(data.scheduled_for).toLocaleString()}` : `Published to ${SOCIAL_PLATFORM_INFO[chosen.platform]?.label || chosen.platform}`);
    setMediaUrl(""); setWhen("now"); setAt("");
    onDone(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish post</DialogTitle>
          <DialogDescription className="truncate">{item?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Account</Label>
            <select value={chosen?.id || ""} onChange={e => setAccountId(e.target.value)}
              className="w-full mt-1 h-9 rounded-md border border-input bg-card px-2 text-sm">
              {matching.map(a => <option key={a.id} value={a.id}>{accountLabel(a)} ({SOCIAL_PLATFORM_INFO[a.platform]?.label || a.platform})</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Image URL {needsImage ? "(required for Instagram)" : "(optional)"}</Label>
            <div className="flex gap-2 items-center mt-1">
              {mediaUrl && /^https:\/\//.test(mediaUrl) && <img src={mediaUrl} alt="" className="w-10 h-10 rounded object-cover border" />}
              <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">When</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={when === "now" ? "default" : "outline"} onClick={() => setWhen("now")}>Now</Button>
              <Button type="button" size="sm" variant={when === "later" ? "default" : "outline"} onClick={() => setWhen("later")}>
                <Clock className="w-3.5 h-3.5 mr-1" />Schedule
              </Button>
            </div>
            {when === "later" && <Input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} />}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !chosen || (needsImage && !mediaUrl.trim()) || (when === "later" && !at)}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            {when === "later" ? "Schedule" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
