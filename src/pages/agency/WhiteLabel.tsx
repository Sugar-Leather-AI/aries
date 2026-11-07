import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Upload, Palette, Globe, Eye, Building2 } from "lucide-react";
import { BRAND } from "@/brand";

const WhiteLabel = () => {
  const [agencyName, setAgencyName] = useState(`${BRAND.name} Agency`);
  const [primaryColor, setPrimaryColor] = useState("#CC6633");
  const [secondaryColor, setSecondaryColor] = useState("#CC6633");
  const [accentColor, setAccentColor] = useState("#818CF8");
  const [customDomain, setCustomDomain] = useState("");
  const [loginHeadline, setLoginHeadline] = useState("The AI-Powered CRM That Runs Your Business");
  const [loginSubtext, setLoginSubtext] = useState("25 AI agents working 24/7 to capture leads, book appointments, recover no-shows, and grow your revenue on autopilot.");

  const handleSave = () => {
    toast.success("White-label settings saved!");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">White Label</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize branding for your clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Identity */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stat-card space-y-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Brand Identity</h3>
            </div>
            <div>
              <Label>Agency Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Upload your logo (PNG, SVG)</p>
                  <p>Recommended: 200x200px, max 2MB</p>
                </div>
              </div>
            </div>
            <div>
              <Label>Favicon</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground">32x32px ICO or PNG</span>
              </div>
            </div>
            <div>
              <Label>Agency Name</Label>
              <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} className="mt-1.5" />
            </div>
          </motion.div>

          {/* Colors */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card space-y-5">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Brand Colors</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Custom Domain */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card space-y-5">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Custom Domain</h3>
            </div>
            <div>
              <Label>Client Portal URL</Label>
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="app.youragency.com" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Point a CNAME record to portal.aria.com</p>
            </div>
          </motion.div>

          {/* Login Page */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card space-y-5">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Login Page Customization</h3>
            </div>
            <div>
              <Label>Headline</Label>
              <Input value={loginHeadline} onChange={e => setLoginHeadline(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Subtext</Label>
              <textarea value={loginSubtext} onChange={e => setLoginSubtext(e.target.value)}
                className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]" />
            </div>
          </motion.div>

          <Button onClick={handleSave} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-1" />Save White Label Settings
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="stat-card sticky top-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />Live Preview
            </h3>
            
            {/* Mini login preview */}
            <div className="rounded-xl border overflow-hidden">
              <div className="p-6" style={{ background: primaryColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm">{agencyName}</span>
                </div>
                <p className="text-white/90 text-xs font-medium leading-relaxed">{loginHeadline}</p>
                <p className="text-white/60 text-[10px] mt-1 leading-relaxed line-clamp-2">{loginSubtext}</p>
              </div>
              <div className="p-4 bg-card space-y-2">
                <div className="h-2 bg-muted rounded w-12 text-[8px]" />
                <div className="h-7 bg-muted rounded" />
                <div className="h-2 bg-muted rounded w-14 text-[8px]" />
                <div className="h-7 bg-muted rounded" />
                <div className="h-7 rounded text-[10px] text-white flex items-center justify-center font-medium" style={{ background: primaryColor }}>
                  Sign in
                </div>
              </div>
            </div>

            {/* Mini sidebar preview */}
            <div className="rounded-xl border overflow-hidden flex h-[200px]">
              <div className="w-[60px] border-r bg-card flex flex-col items-center py-3 gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-7 h-7 rounded-lg ${i === 0 ? 'bg-accent' : ''}`}>
                    <div className={`w-3 h-3 rounded mx-auto mt-2 ${i === 0 ? '' : 'bg-muted'}`}
                      style={i === 0 ? { background: primaryColor } : {}} />
                  </div>
                ))}
              </div>
              <div className="flex-1 p-3 bg-background">
                <div className="h-2 rounded w-16 mb-3" style={{ background: primaryColor, opacity: 0.6 }} />
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-card rounded border" />
                  ))}
                </div>
              </div>
            </div>

            {/* Color swatches */}
            <div className="flex gap-2">
              <div className="flex-1 text-center">
                <div className="h-8 rounded-lg mb-1" style={{ background: primaryColor }} />
                <span className="text-[10px] text-muted-foreground">Primary</span>
              </div>
              <div className="flex-1 text-center">
                <div className="h-8 rounded-lg mb-1" style={{ background: secondaryColor }} />
                <span className="text-[10px] text-muted-foreground">Secondary</span>
              </div>
              <div className="flex-1 text-center">
                <div className="h-8 rounded-lg mb-1" style={{ background: accentColor }} />
                <span className="text-[10px] text-muted-foreground">Accent</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabel;
