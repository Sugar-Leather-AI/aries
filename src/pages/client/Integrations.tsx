import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ExternalLink, Settings, Unplug } from "lucide-react";

const sections = [
  {
    title: "CRM Integrations",
    items: [
      { name: "HubSpot CRM", desc: "Sync contacts, deals & activities", connected: false },
      { name: "Salesforce", desc: "Enterprise CRM sync", connected: false },
      { name: "Pipedrive", desc: "Last sync: 2 min ago · 847 contacts", connected: true },
      { name: "Zoho CRM", desc: "Full CRM integration", connected: false },
    ],
  },
  {
    title: "Communication",
    items: [
      { name: "Twilio", desc: "SMS & voice calls · Active", connected: true },
      { name: "Gmail", desc: "Email integration", connected: false },
      { name: "Outlook", desc: "Microsoft email sync", connected: false },
      { name: "WhatsApp Business", desc: "WhatsApp messaging", connected: false },
    ],
  },
  {
    title: "Other Tools",
    items: [
      { name: "Stripe", desc: "Payment processing · Active", connected: true },
      { name: "Google Calendar", desc: "Calendar sync · Active", connected: true },
      { name: "QuickBooks", desc: "Accounting integration", connected: false },
      { name: "Google Business", desc: "Review management · Active", connected: true },
    ],
  },
];

const Integrations = () => (
  <div className="space-y-6">
    <div className="page-header">
      <div>
        <h1 className="page-title">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect your existing tools</p>
      </div>
    </div>

    {sections.map((section, si) => (
      <section key={section.title}>
        <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {section.items.map((item, i) => (
            <motion.div key={item.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (si * 4 + i) * 0.04 }}
              className={cn("stat-card", item.connected && "border-success/30")}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                  item.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                  {item.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                  {item.connected && <span className="text-[10px] text-success font-medium flex items-center gap-0.5"><Check className="w-3 h-3" />Connected</span>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
              {item.connected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs"><Settings className="w-3 h-3 mr-1" />Settings</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"><Unplug className="w-3 h-3" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-7 text-xs">Connect <ExternalLink className="w-3 h-3 ml-1" /></Button>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default Integrations;
