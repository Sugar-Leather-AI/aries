import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { niches } from "@/data/mockData";

const steps = ["Business Info", "Plan Selection", "Review"];

const AddClient = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ businessName: "", ownerName: "", email: "", phone: "", niche: "", city: "", state: "", plan: "Starter" });
  const navigate = useNavigate();

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    toast.success("Client added successfully!");
    navigate("/agency/clients");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agency/clients")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="page-title">Add New Client</h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn("text-sm hidden sm:block", i <= step ? "text-foreground font-medium" : "text-muted-foreground")}>{s}</span>
            {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 rounded", i < step ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="stat-card space-y-4">
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Business Name *</Label><Input value={form.businessName} onChange={e => updateForm("businessName", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Owner Full Name *</Label><Input value={form.ownerName} onChange={e => updateForm("ownerName", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Email Address *</Label><Input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Phone Number *</Label><Input value={form.phone} onChange={e => updateForm("phone", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Business Type</Label>
                <select value={form.niche} onChange={e => updateForm("niche", e.target.value)} className="w-full mt-1.5 h-10 rounded-md border px-3 text-sm bg-card text-foreground">
                  <option value="">Select...</option>{niches.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>City</Label><Input value={form.city} onChange={e => updateForm("city", e.target.value)} className="mt-1.5" /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => updateForm("state", e.target.value)} className="mt-1.5" /></div>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Starter", price: "$297/mo", desc: "5 AI agents, 500 contacts" },
              { name: "Growth", price: "$497/mo", desc: "15 AI agents, unlimited contacts" },
              { name: "Pro", price: "$697/mo", desc: "All 25 agents, priority support" },
            ].map(p => (
              <button key={p.name} onClick={() => updateForm("plan", p.name)}
                className={cn("p-4 rounded-lg border-2 text-left transition-all",
                  form.plan === p.name ? "border-primary bg-accent/50" : "border-border hover:border-primary/30")}>
                <p className="font-bold text-foreground">{p.name}</p>
                <p className="text-lg font-bold text-primary mt-1">{p.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Review Details</h3>
            {Object.entries(form).filter(([_, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-medium text-foreground">{v}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={handleSubmit}>Create Client <Check className="w-4 h-4 ml-1" /></Button>
        )}
      </div>
    </div>
  );
};

export default AddClient;
