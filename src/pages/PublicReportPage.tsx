import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPublicReportQuery } from '../store/apiSlice';
import { Printer, Hexagon, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const PublicReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useGetPublicReportQuery(id || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-outline">Decrypting Analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full p-12 bg-surface-container rounded-[2.5rem] border border-error/20 flex flex-col items-center">
          <div className="w-16 h-16 bg-error/10 text-error rounded-3xl flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-2">Report Not Found</h2>
          <p className="text-sm text-outline-variant font-medium mb-8">
            The verification ID #{(id || '').slice(0, 8)} could not be found or has been withdrawn from our secure servers.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-primary text-on-primary rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Go to Laboratory Portal
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/20 p-4 sm:p-8 md:p-12 print:p-0">
      {/* Action Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-end print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="p-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* Main Report Document */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white border-[4px] sm:border-[10px] border-slate-50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] rounded-[2rem] sm:rounded-[3rem] overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        <div className="p-6 sm:p-16 space-y-8 sm:space-y-12">
          {/* Header */}
          <header className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 pb-8 sm:pb-12 border-b-2 border-slate-100">
            <div className="text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Hexagon size={24} fill="white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic leading-none">
                  <span className="text-primary">Metallurgist</span> Pro
                </h1>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Certified Analysis Laboratory</p>
            </div>
          </header>

          {/* Metadata Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Client Identity</span>
              <p className="text-xs sm:text-sm font-black text-slate-900 uppercase truncate">{report.customer_name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Analysis Date</span>
              <p className="text-xs sm:text-sm font-black text-slate-900">{report.date}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Contact Index</span>
              <p className="text-xs sm:text-sm font-mono font-bold text-slate-600 truncate">{report.phone_number}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Intake Mass</span>
              <p className="text-xs sm:text-sm font-black text-slate-900">{report.gold_weight} g</p>
            </div>
          </section>

          {/* Analysis Data Table */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-primary" />
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-900">Spectrometric Breakdown</h3>
            </div>
            
            <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {/* Responsive Content: 2-column grid on desktop, 1 on mobile */}
                <div className="divide-y divide-slate-100">
                  {report.metals.slice(0, 11).map((metal: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-8 flex justify-center px-1.5 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-500">{metal.symbol}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-900">{metal.metal}</span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-black text-slate-900">{metal.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-slate-100">
                  {report.metals.slice(11).map((metal: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-8 flex justify-center px-1.5 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-500">{metal.symbol}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-900">{metal.metal}</span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-black text-slate-900">{metal.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Footer Summary */}
          <footer className="pt-8 sm:pt-12 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-8 sm:gap-12">
            <div className="text-center sm:text-right space-y-4 w-full sm:w-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Atomic Aggregate</span>
                <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">{report.total_aggregate}%</p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Gold Purity Index</span>
                <span className="text-[10px] sm:text-[11px] font-black text-primary">{report.purity_percentage}%</span>
              </div>
            </div>
          </footer>

          <div className="text-center pt-4 sm:pt-8 pb-4">
            <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
              metallurgist.pro secure analysis node
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicReportPage;
