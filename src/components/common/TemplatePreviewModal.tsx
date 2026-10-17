import React, { useState } from "react";
import { X, Check, Eye, Layers } from "lucide-react";
import { ReportTemplateId, REPORT_TEMPLATES, SharedReportPayload } from "../../types/report";
import { ReportTemplateRenderer } from "../report/ReportTemplateRenderer";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTemplateId: ReportTemplateId;
  onSelectTemplate: (id: ReportTemplateId) => void;
  shopName?: string;
}

const SAMPLE_PREVIEW_PAYLOAD: SharedReportPayload = {
  version: "1.0",
  reportId: "DEMO-REP-752",
  customerName: "Radha Jewelers",
  sampleType: "18K Gold Ornament",
  weight: "4.850",
  timestamp: new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  goldPurity: "75.240",
  karatExact: "18.06",
  karatDisplay: "18K",
  metals: [
    { id: "gold", name: "Gold", symbol: "Au", value: "75.240" },
    { id: "silver", name: "Silver", symbol: "Ag", value: "15.100" },
    { id: "copper", name: "Copper", symbol: "Cu", value: "9.420" },
    { id: "zinc", name: "Zinc", symbol: "Zn", value: "0.240" },
    { id: "cadmium", name: "Cadmium", symbol: "Cd", value: "0.000" },
    { id: "nickel", name: "Nickel", symbol: "Ni", value: "0.000" },
    { id: "platinum", name: "Platinum", symbol: "Pt", value: "0.000" },
    { id: "palladium", name: "Palladium", symbol: "Pd", value: "0.000" },
  ],
  marketRate: {
    ratePerGram: 11197,
    rateSource: "IBJA Retail Standard",
    calculatedGoldValue: 54305.45,
    fetchedAt: new Date().toISOString(),
    karatCategory: "18K",
  },
  templateId: "classic-lab",
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  activeTemplateId,
  onSelectTemplate,
  shopName,
}) => {
  const [viewingTemplate, setViewingTemplate] = useState<ReportTemplateId>(activeTemplateId);

  React.useEffect(() => {
    if (isOpen) {
      setViewingTemplate(activeTemplateId);
    }
  }, [isOpen, activeTemplateId]);

  if (!isOpen) return null;

  const currentMeta = REPORT_TEMPLATES.find((t) => t.id === viewingTemplate) || REPORT_TEMPLATES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-4 sm:p-6 z-10 max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="font-headline font-bold text-base sm:text-lg text-slate-900">
                Report Template Preview
              </h2>
              <p className="text-xs text-slate-500">
                Preview how shared reports will render for recipients
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="py-3 flex items-center gap-1.5 overflow-x-auto shrink-0 border-b border-slate-100">
          {REPORT_TEMPLATES.map((tmpl) => {
            const isViewing = viewingTemplate === tmpl.id;
            const isSelected = activeTemplateId === tmpl.id;

            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setViewingTemplate(tmpl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isViewing
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tmpl.name}</span>
                {isSelected && (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Document Preview */}
        <div className="flex-1 overflow-y-auto py-4 bg-slate-50/70 rounded-xl my-3 p-3 sm:p-5 border border-slate-200/80">
          <ReportTemplateRenderer
            payload={{
              ...SAMPLE_PREVIEW_PAYLOAD,
              shopName: shopName || undefined,
              templateId: viewingTemplate,
            }}
            checksum="verified"
            templateId={viewingTemplate}
          />
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Current layout: <strong className="text-slate-800">{currentMeta.name}</strong> ({currentMeta.badge})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTemplate(viewingTemplate);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check size={14} />
              <span>Use This Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
