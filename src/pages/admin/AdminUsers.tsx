import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Ban, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { BannedEmails, banEmail } from "@/components/admin/BannedEmails";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
  signup_domain?: string | null;
  signup_attribution?: Record<string, string> | null;
}

// "Google · /ai-receptionist · spring-promo": where a sign-up first came from.
function sourceLabel(a?: Record<string, string> | null): string | null {
  if (!a) return null;
  const from = a.utm_source || (a.referrer ? a.referrer.replace(/^www\./, "") : "direct");
  return [from, a.landing && a.landing !== "/" ? a.landing : null, a.utm_campaign].filter(Boolean).join(" · ");
}

const ROLES = ["super_admin", "agency_owner", "client"] as const;

// Error carrying the function's parsed JSON body (e.g. { requiresForce, clientCount }).
class AdminError extends Error {
  body: Record<string, unknown>;
  constructor(message: string, body: Record<string, unknown>) {
    super(message);
    this.body = body;
  }
}

async function callAdmin(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, payload },
  });
  if (error) {
    // Surface the function's JSON error body/message when present.
    let body: Record<string, unknown> = {};
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) body = await ctx.json();
    } catch { /* keep default */ }
    throw new AdminError((body.message as string) || (body.error as string) || error.message, body);
  }
  if (data?.error) throw new AdminError(data.message || data.error, data);
  return data;
}

const AdminUsers = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add-user dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "client" });
  const [creating, setCreating] = useState(false);

  // Delete confirmation state
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [banOnDelete, setBanOnDelete] = useState(false);
  const [banRefresh, setBanRefresh] = useState(0);
  // Second-stage confirmation when a delete would cascade real clients.
  const [cascadeWarn, setCascadeWarn] = useState<{ user: AdminUser; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callAdmin("list");
      setUsers(data.users ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    setCreating(true);
    try {
      await callAdmin("create", form);
      toast.success("User created");
      setAddOpen(false);
      setForm({ email: "", password: "", fullName: "", role: "client" });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (id: string, action: string, payload: Record<string, unknown>, msg: string) => {
    setBusyId(id);
    try {
      await callAdmin(action, payload);
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (user: AdminUser, force: boolean) => {
    setBusyId(user.user_id);
    try {
      await callAdmin("delete", { userId: user.user_id, force });
      if (banOnDelete && user.email) {
        try {
          await banEmail(user.email, "Deleted by an admin");
          setBanRefresh(n => n + 1);
          toast.success(`User deleted and ${user.email} banned`);
        } catch (e) {
          toast.error(`User deleted, but the ban failed: ${e instanceof Error ? e.message : e}`);
        }
      } else {
        toast.success("User deleted");
      }
      setToDelete(null);
      setCascadeWarn(null);
      await load();
    } catch (e) {
      // The server asks for confirmation when deleting would cascade real clients.
      if (e instanceof AdminError && e.body.requiresForce) {
        setToDelete(null);
        setCascadeWarn({ user, message: String(e.body.message ?? e.message) });
        return;
      }
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="text" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search}
          onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="stat-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading users...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">User</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Role</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Signed up on</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(u => {
                const isMe = u.user_id === me?.id;
                const primaryRole = u.roles[0] ?? "client";
                const busy = busyId === u.user_id;
                return (
                  <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Select value={primaryRole} disabled={isMe || busy}
                        onValueChange={v => runAction(u.user_id, "set-role", { userId: u.user_id, role: v }, "Role updated")}>
                        <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {u.signup_domain
                        ? <Badge variant="outline" className="font-normal">{u.signup_domain}</Badge>
                        : <span className="text-xs text-muted-foreground" title="Signed up before this was recorded">—</span>}
                      {sourceLabel(u.signup_attribution) && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title="First visit: where they came from, the page they landed on, and campaign">
                          {sourceLabel(u.signup_attribution)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {u.blocked
                        ? <Badge variant="destructive">Blocked</Badge>
                        : <Badge variant="secondary">Active</Badge>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {u.blocked ? (
                          <Button variant="ghost" size="sm" disabled={busy}
                            onClick={() => runAction(u.user_id, "unblock", { userId: u.user_id }, "User unblocked")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />Unblock
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled={isMe || busy}
                            onClick={() => runAction(u.user_id, "block", { userId: u.user_id }, "User blocked")}>
                            <Ban className="w-4 h-4 mr-1" />Block
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive"
                          disabled={isMe || busy} onClick={() => { setBanOnDelete(false); setToDelete(u); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{toDelete?.email}</strong> and all their data.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={banOnDelete} onChange={e => setBanOnDelete(e.target.checked)} className="rounded border-input" />
            Also ban this email so it can't sign up again
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && deleteUser(toDelete, false)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BannedEmails refreshKey={banRefresh} />

      {/* Second-stage confirmation: deleting this user cascades to real clients. */}
      <AlertDialog open={!!cascadeWarn} onOpenChange={o => !o && setCascadeWarn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">This will delete other clients too</AlertDialogTitle>
            <AlertDialogDescription>
              {cascadeWarn?.message} Are you absolutely sure you want to permanently
              delete <strong>{cascadeWarn?.user.email}</strong> and everything under it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cascadeWarn && deleteUser(cascadeWarn.user, true)}>
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
