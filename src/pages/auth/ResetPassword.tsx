import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';
// Brand icon rendered inline via SVG

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setLoading(true);
    await resetPassword(password);
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <AriesLogo tone="dark" markClassName="w-9 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Set new password</h2>
        <p className="text-muted-foreground mb-8">Your new password must be at least 6 characters</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="mt-1.5" />
            {password && confirm && password !== confirm && <p className="text-sm text-destructive mt-1">Passwords don't match</p>}
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-700 hover:to-ember-700 text-white shadow-lg shadow-ember-500/25" disabled={loading || password !== confirm}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
