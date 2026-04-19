import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { Link, Copy, Check, X, Share2 } from "lucide-react";

interface IntakeLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntakeLinkModal: React.FC<IntakeLinkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;

  const domain = window.location.origin;
  const intakeUrl = `${domain}/intake?user_id=${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl p-8 flex flex-col items-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mb-6">
              <Share2 size={32} />
            </div>

            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Share Intake Link</h2>
            <p className="text-sm text-slate-500 font-medium mb-8 text-center">
              Customers can scan this QR code or use the link below to submit their intake details directly to your queue.
            </p>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                <QRCodeSVG 
                  value={intakeUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Scan Point</p>
            </div>

            <div className="w-full space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <Link size={16} />
                </div>
                <input 
                  type="text" 
                  readOnly
                  value={intakeUrl}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-0 border-b-2 border-slate-100 font-mono text-xs text-slate-600 focus:ring-0 focus:border-primary transition-all rounded-2xl"
                />
                <button 
                  onClick={handleCopy}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
