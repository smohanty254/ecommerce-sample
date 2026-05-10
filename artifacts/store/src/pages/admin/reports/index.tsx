import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, FileText, FileSpreadsheet, Loader2, CheckCircle2, Clock, BarChart3, Package, Users, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PERIODS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

const REPORT_SECTIONS = [
  { icon: BarChart3, label: "Executive Summary", desc: "KPIs: total revenue, orders, avg order value, customers" },
  { icon: BarChart3, label: "Daily Sales Breakdown", desc: "Day-by-day revenue and order counts for the selected period" },
  { icon: Package, label: "Top 20 Products", desc: "Best-performing products by revenue and units sold" },
  { icon: ShoppingCart, label: "Revenue by Category", desc: "Category-level revenue with percentage breakdown" },
  { icon: ShoppingCart, label: "Recent Orders", desc: "Last 50 orders with customer info and status" },
  { icon: Package, label: "Low Stock Alert", desc: "All products with fewer than 10 units remaining" },
];

type DownloadState = "idle" | "loading" | "done" | "error";

export default function AdminReports() {
  const [period, setPeriod] = useState("30d");
  const [pdfState, setPdfState] = useState<DownloadState>("idle");
  const [excelState, setExcelState] = useState<DownloadState>("idle");
  const { token } = useAuth();

  async function download(format: "pdf" | "excel") {
    const setState = format === "pdf" ? setPdfState : setExcelState;
    setState("loading");
    try {
      const res = await fetch(`/api/reports/${format}?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "pdf" ? "pdf" : "xlsx";
      a.download = `ecostore-report-${period}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  function ButtonContent({ state, icon: Icon, label }: { state: DownloadState; icon: React.ElementType; label: string }) {
    if (state === "loading") return <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>;
    if (state === "done") return <><CheckCircle2 className="h-4 w-4 text-green-400" /> Downloaded!</>;
    if (state === "error") return <><span className="text-red-400">⚠</span> Error — retry</>;
    return <><Icon className="h-4 w-4" /> {label}</>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Exports</h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive analytics reports as PDF or Excel spreadsheets.
        </p>
      </div>

      {/* Period selector + action cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            Configure Report
          </CardTitle>
          <CardDescription>
            Choose a time period, then download the report in your preferred format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <label className="text-sm font-medium w-28 shrink-0">Time Period</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Applies to sales charts and trend data. Summary totals are always all-time.
            </span>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF Card */}
            <div className="rounded-lg border border-border bg-muted/30 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold">PDF Report</p>
                  <p className="text-xs text-muted-foreground">Multi-page formatted document</p>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Print-ready A4 layout</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Branded header & styled tables</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> 3 pages covering all data</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Great for sharing &amp; archiving</li>
              </ul>
              <Button
                onClick={() => download("pdf")}
                disabled={pdfState === "loading"}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <ButtonContent state={pdfState} icon={FileDown} label="Download PDF" />
              </Button>
            </div>

            {/* Excel Card */}
            <div className="rounded-lg border border-border bg-muted/30 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold">Excel Workbook</p>
                  <p className="text-xs text-muted-foreground">6 sheets with raw data</p>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex gap-2"><span className="text-green-400">✓</span> 6 separate data sheets</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Styled headers &amp; alternating rows</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> SUM formulas included</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Ready for pivot tables &amp; charts</li>
              </ul>
              <Button
                onClick={() => download("excel")}
                disabled={excelState === "loading"}
                className="w-full bg-green-700 hover:bg-green-800 text-white"
              >
                <ButtonContent state={excelState} icon={FileDown} label="Download Excel" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's included */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What's Included in Every Report</CardTitle>
          <CardDescription>Both formats contain the same underlying data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORT_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.label} className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <Icon className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Format comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Format Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Feature</th>
                  <th className="py-2 px-4 font-medium text-red-400">PDF</th>
                  <th className="py-2 px-4 font-medium text-green-400">Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  ["Printable / shareable", "✓", "✓"],
                  ["Branded formatting", "✓", "✓"],
                  ["Data filtering & sorting", "✗", "✓"],
                  ["Pivot table ready", "✗", "✓"],
                  ["Embedded formulas (SUM)", "✗", "✓"],
                  ["Page-by-page layout", "✓", "✗"],
                  ["Best for presentations", "✓", "✗"],
                  ["Best for further analysis", "✗", "✓"],
                ].map(([feat, pdf, excel]) => (
                  <tr key={feat}>
                    <td className="py-2 pr-4 text-muted-foreground">{feat}</td>
                    <td className={`py-2 px-4 text-center font-medium ${pdf === "✓" ? "text-green-400" : "text-muted-foreground/40"}`}>{pdf}</td>
                    <td className={`py-2 px-4 text-center font-medium ${excel === "✓" ? "text-green-400" : "text-muted-foreground/40"}`}>{excel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
