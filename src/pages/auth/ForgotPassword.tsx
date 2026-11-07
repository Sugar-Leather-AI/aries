import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian via-obsidian to-slate-950" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: "radial-gradient(circle at 25% 25%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 50% 10%, rgba(204,102,51,0.2) 0%, transparent 40%)" }} />
        </div>
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-64 h-64 rounded-full bg-ember-500/10 blur-3xl" />
        <motion.div animate={{ y: [0, 15, 0], x: [0, -15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-ember-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3">
              <AriesLogo tone="light" markClassName="w-9 h-7" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-5 leading-[1.15] tracking-tight">
              Back in<br />a moment
            </h1>
            <p className="text-lg text-silver leading-relaxed">
              Enter your email and we'll send you a link to set a new password.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <p className="text-xs text-ember-400/40">Every agent in sync. Every operation in flow.</p>
          </motion.div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <AriesLogo tone="dark" markClassName="w-9 h-7" />
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-8 h-8 text-ember-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">We sent a password reset link to <strong>{email}</strong></p>
              <Link to="/login"><Button variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Back to login</Button></Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h2>
              <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset link</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1.5" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-700 hover:to-ember-700 text-white shadow-lg shadow-ember-500/25" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-ember-600 hover:text-ember-700 hover:underline font-medium"><ArrowLeft className="w-3 h-3 inline mr-1" />Back to login</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
