import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Printer,
  Download,
  FlaskConical,
  RotateCcw,
  Sliders,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { verifyAndDecodeReport } from "../utils/cryptoReport";
import { SharedReportPayload, ReportTemplateId, REPORT_TEMPLATES } from "../types/report";
import { ReportTemplateRenderer } from "../components/report/ReportTemplateRenderer";

export const SharedReportPage: React.FC = () => {
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportPayload, setReportPayload] = useState<SharedReportPayload | null>(null);
  const [checksum, setChecksum] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateId>("classic-lab");

  // Extract query parameters from either window.location.search or HashRouter's search
  useEffect(() => {
    async function verifyReport() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Query params might be in location.search or in window.location.hash
        let search = location.search;
        if (!search && window.location.hash.includes("?")) {
          search = window.location.hash.substring(window.location.hash.indexOf("?"));
        }

        const params = new URLSearchParams(search);
        const encodedData = params.get("d") || "";
        const providedChecksum = params.get("c") || "";
        const templateParam = (params.get("t") as ReportTemplateId) || "";

        if (!encodedData || !providedChecksum) {
          setIsValid(false);
          setErrorMessage(
            "Report data validation failed. The shared report may have been modified or corrupted."
          );
          setIsLoading(false);
          return;
        }

        setChecksum(providedChecksum);

        const result = await verifyAndDecodeReport(encodedData, providedChecksum);

        if (!result.isValid || !result.payload) {
          setIsValid(false);
          setErrorMessage(
            result.error ||
              "Report data validation failed. The shared report may have been modified or corrupted."
          );
        } else {
          setIsValid(true);
          setReportPayload(result.payload);

          // Use template from URL if valid, or payload template, fallback to classic-lab
          const validTemplateIds = REPORT_TEMPLATES.map((t) => t.id);
          if (templateParam && validTemplateIds.includes(templateParam)) {
            setSelectedTemplate(templateParam);
          } else if (result.payload.templateId && validTemplateIds.includes(result.payload.templateId)) {
            setSelectedTemplate(result.payload.templateId);
          } else {
            setSelectedTemplate("classic-lab");
          }
        }
      } catch (err: any) {
        setIsValid(false);
        setErrorMessage(
          "Report data validation failed. The shared report may have been modified or corrupted."
        );
      } finally {
        setIsLoading(false);
      }
    }

    verifyReport();
  }, [location.search]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!reportPayload) return;
    const reportElem = document.getElementById("printable-verified-report");
    if (!reportElem) return;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assay Certificate - ${reportPayload.customerName || "Report"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; padding: 20px; color: #1e293b; }
    @media print { body { padding: 0; } }
  </style>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${reportElem.outerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Assay_Certificate_${reportPayload.customerName || "Report"}_${reportPayload.karatDisplay}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-body flex flex-col selection:bg-amber-200">
      {/* Top Banner (Hidden in print) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group text-slate-900"
            title="Open Metallurgist Workspace"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <FlaskConical size={16} className="text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-sm tracking-tight">
                Metallurgist
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Official Report Viewer
              </span>
            </div>
          </Link>

          {isValid && reportPayload && (
            <div className="flex items-center gap-2">
              {/* Template Switcher Dropdown */}
              <div className="relative inline-flex items-center">
                <Sliders size={13} className="text-slate-400 absolute left-2.5 pointer-events-none" />
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as ReportTemplateId)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold pl-7 pr-6 py-1.5 rounded-lg border border-slate-300 focus:outline-none cursor-pointer appearance-none shadow-2xs"
                  title="Change Certificate Template"
                >
                  {REPORT_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.badge})
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Print Certificate"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Download Certificate File"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {isLoading && (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Verifying cryptographic SHA-256 certificate signature...
            </p>
          </div>
        )}

        {!isLoading && !isValid && (
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={36} />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-headline text-slate-900 tracking-tight">
              Report Validation Failed
            </h2>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-medium text-red-800 text-left">
              <p className="font-bold mb-1">Security Alert:</p>
              <p>{errorMessage || "Report data validation failed. The shared report may have been modified or corrupted."}</p>
            </div>

            <p className="text-xs text-slate-500">
              The cryptographic signature of this report does not match the payload. To protect integrity, this report cannot be generated or viewed.
            </p>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Go to Lab Workspace
              </Link>
            </div>
          </div>
        )}

        {!isLoading && isValid && reportPayload && (
          <div className="space-y-4">
            {/* Cryptographic Verification Header Banner */}
            <div className="print:hidden bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Cryptographically Verified (SHA-256 Checksum Valid)</span>
                    <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      Authentic
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-800 truncate max-w-md mt-0.5">
                    Hash: {checksum}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 hover:text-emerald-950 underline"
                >
                  <span>Open Assaying Studio</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            {/* Rendered Template Document */}
            <div id="printable-verified-report">
              <ReportTemplateRenderer
                payload={reportPayload}
                checksum={checksum}
                templateId={selectedTemplate}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedReportPage;
