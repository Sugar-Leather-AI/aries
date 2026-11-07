import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

interface LeadCaptureWidgetProps {
  clientId: string;
  greeting?: string;
  position?: "bottom-right" | "bottom-left";
}

const LeadCaptureWidget = ({ clientId, greeting = "How can I help you today?", position = "bottom-right" }: LeadCaptureWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ name: string; email: string; phone: string; contact_id: string } | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleContactSubmit = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      setFormError("Please enter a valid email.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      // Check if contact exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("client_id", clientId)
        .eq("email", formEmail.trim())
        .maybeSingle();

      let contactId: string;
      if (existing) {
        contactId = existing.id;
      } else {
        const nameParts = formName.trim().split(" ");
        const { data: newContact, error } = await supabase.from("contacts").insert({
          client_id: clientId,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(" ") || "",
          email: formEmail.trim(),
          phone: formPhone.trim() || null,
          status: "Lead",
          source: "Chat Widget",
        }).select("id").single();
        if (error) throw error;
        contactId = newContact.id;
      }
      setContactInfo({ name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(), contact_id: contactId });
      setMessages([{ role: "assistant", content: `Hi ${formName.trim().split(" ")[0]}! 👋 ${greeting}` }]);
    } catch (e) {
      console.error("Contact registration error:", e);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const send = async () => {
    if (!input.trim() || loading || !contactInfo) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("lead-capture-bot", {
        body: { messages: history.map((m) => ({ role: m.role, content: m.content })), client_id: clientId, contact_id: contactInfo.contact_id },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Please wait a moment before sending another message.");
        else toast.error(data.error);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("fixed z-50", position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6")}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[360px] rounded-2xl border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary-foreground" />
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">Chat with us</p>
                  <p className="text-[10px] text-primary-foreground/70">We typically reply in minutes</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!contactInfo ? (
              /* Contact Form */
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">👋 Welcome!</h3>
                  <p className="text-xs text-muted-foreground">Share your info so we can assist you better.</p>
                </div>
                <Input placeholder="Your name *" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Email address *" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Phone (optional)" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="h-9 text-sm" />
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <Button className="w-full" onClick={handleContactSubmit} disabled={submitting}>
                  {submitting ? "Starting..." : "Start Chat"}
                </Button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="h-[320px] overflow-y-auto p-3 space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div className={cn("max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed",
                        msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
                        {msg.content}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    className="h-9 text-sm"
                    disabled={loading}
                  />
                  <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={send} disabled={!input.trim() || loading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default LeadCaptureWidget;
