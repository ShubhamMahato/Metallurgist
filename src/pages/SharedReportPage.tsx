import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Printer,
  Download,
  FlaskConical,
} from "lucide-react";
import { verifyAndDecodeReport, fetchLiveIbjaRate } from "../utils/cryptoReport";
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

        if (!encodedData || !providedChecksum) {
          setIsValid(false);
          setErrorMessage(
            "Report data validation failed. The shared report link is missing security parameters."
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
              "Report data validation failed. The shared report link has been modified or corrupted."
          );
          setIsLoading(false);
          return;
        }

        setIsValid(true);
        setReportPayload(result.payload);

        const directTmpl = params.get("tmpl") || params.get("template");
        if (directTmpl && REPORT_TEMPLATES.some((t) => t.id === directTmpl)) {
          setSelectedTemplate(directTmpl as ReportTemplateId);
        } else if (result.payload.templateId) {
          setSelectedTemplate(result.payload.templateId);
        }

        setIsLoading(false);

        // Dynamically fetch and calculate live market rate when user opens the report
        fetchLiveIbjaRate(result.payload.karatDisplay, result.payload.goldPurity).then((rate) => {
          if (rate) {
            setReportPayload((prev) => {
              if (!prev) return null;
              const wt = parseFloat(prev.weight) || 0;
              return {
                ...prev,
                marketRate: {
                  ...rate,
                  calculatedGoldValue: Math.round(wt * rate.ratePerGram * 100) / 100,
                },
              };
            });
          }
        });
      } catch (err: any) {
        setIsValid(false);
        setErrorMessage(
          "Report data validation failed. The shared report link is invalid or corrupted."
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
  <title>Metallurgical Report - ${reportPayload.customerName || "Jeweller"}</title>
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
    a.download = `Metallurgical_Report_${reportPayload.customerName || "Jeweller"}_${reportPayload.karatDisplay}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-body flex flex-col selection:bg-amber-200">
      {/* Top Banner (Hidden in print) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 select-none text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-2xs">
              <FlaskConical size={16} className="text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-sm tracking-tight text-slate-900">
                {reportPayload?.shopName || "Metallurgist"}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Report Viewer
              </span>
            </div>
          </div>

          {isValid && reportPayload && (
            <div className="flex items-center gap-2">
              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Print Report"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Download Report File"
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
              Loading report...
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
              <p className="font-bold mb-1">Notice:</p>
              <p>{errorMessage || "The shared report link could not be validated or is incomplete."}</p>
            </div>

            <p className="text-xs text-slate-500">
              Please contact the issuing assay laboratory or jeweller to request a valid report link.
            </p>
          </div>
        )}

        {!isLoading && isValid && reportPayload && (
          <div className="space-y-4">
            {/* Top info bar */}
            <div className="print:hidden flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-mono text-[11px] text-slate-400">
                {reportPayload.reportId} • {reportPayload.timestamp}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Verified Report</span>
              </span>
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
