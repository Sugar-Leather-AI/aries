import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParsedRow {
  name: string;
  website?: string;
  industry?: string;
  segment?: string;
  description?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  employee_count?: string;
  revenue_range?: string;
  [key: string]: string | undefined;
}

const EXPECTED_COLUMNS = [
  "name", "website", "industry", "segment", "description",
  "phone", "email", "city", "state", "country", "employee_count", "revenue_range",
];

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const rows = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  }).filter(r => r.name);
  return { headers, rows };
}

export default function CsvImportDialog({ open, onOpenChange, onImported }: CsvImportDialogProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCsv(text);
      if (data.rows.length === 0) {
        toast.error("No valid rows found. Ensure a 'name' column exists.");
        return;
      }
      setParsed(data);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    try {
      const { data: clientId, error: ensureError } = await supabase.rpc("ensure_user_client_id");
      if (ensureError || !clientId) { toast.error("Failed to set up your account"); setImporting(false); return; }

      let success = 0;
      let failed = 0;

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < parsed.rows.length; i += batchSize) {
        const batch = parsed.rows.slice(i, i + batchSize).map(row => {
          let website = (row.website || "").trim();
          if (website && !website.startsWith("http")) website = `https://${website}`;
          let domain: string | null = null;
          try { domain = website ? new URL(website).hostname : null; } catch { }
          return {
            client_id: clientId,
            name: row.name,
            website: website || null,
            domain,
            industry: row.industry || null,
            segment: row.segment || null,
            description: row.description || null,
            phone: row.phone || null,
            email: row.email || null,
            city: row.city || null,
            state: row.state || null,
            country: row.country || null,
            employee_count: row.employee_count || null,
            revenue_range: row.revenue_range || null,
          };
        });

        const { error, data } = await supabase.from("companies").insert(batch as any).select("id");
        if (error) {
          failed += batch.length;
        } else {
          success += (data?.length || 0);
          failed += batch.length - (data?.length || 0);
        }
      }

      setResult({ success, failed });
      if (success > 0) {
        toast.success(`Imported ${success} companies`);
        onImported();
      }
      if (failed > 0) toast.error(`${failed} rows failed to import`);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import Companies
          </DialogTitle>
          <DialogDescription>Upload a CSV file with company data. Required column: <code className="text-primary font-semibold">name</code></DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.success} imported successfully{result.failed > 0 && `, ${result.failed} failed`}
              </p>
            </div>
            <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
          </div>
        ) : !parsed ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supported columns: {EXPECTED_COLUMNS.join(", ")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{parsed.rows.length} companies found</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}><X className="w-4 h-4" /></Button>
            </div>

            {/* Column mapping preview */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Detected columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.headers.map(h => (
                  <Badge key={h} variant={EXPECTED_COLUMNS.includes(h) ? "default" : "outline"}
                    className={cn("text-[10px]", EXPECTED_COLUMNS.includes(h) ? "bg-primary/10 text-primary border-primary/20" : "")}>
                    {h} {EXPECTED_COLUMNS.includes(h) ? "✓" : ""}
                  </Badge>
                ))}
              </div>
              {!parsed.headers.includes("name") && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3 h-3" /> Missing required "name" column
                </p>
              )}
            </div>

            {/* Preview rows */}
            <div className="max-h-40 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>{parsed.headers.slice(0, 5).map(h => <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {parsed.headers.slice(0, 5).map(h => <td key={h} className="px-2 py-1.5 truncate max-w-[120px]">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <p className="text-center text-xs text-muted-foreground py-1.5 border-t">
                  ...and {parsed.rows.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {parsed && !result && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !parsed.headers.includes("name")} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing..." : `Import ${parsed.rows.length} Companies`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
