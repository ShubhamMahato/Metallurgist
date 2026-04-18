import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPublicReportQuery } from '../store/apiSlice';
import { Printer, Share2, ArrowLeft, Hexagon, ShieldCheck, Sparkles } from 'lucide-react';
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
            <ShieldCheck size={32} />
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
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate('/')}
          className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
        >
          <ArrowLeft size={16} />
          Back
        </button>
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
        className="max-w-4xl mx-auto bg-white border-[10px] border-slate-50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] rounded-[3rem] overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        <div className="p-8 sm:p-16 space-y-12">
          {/* Header */}
          <header className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-8 pb-12 border-b-2 border-slate-100">
            <div className="text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Hexagon size={24} fill="white" />
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
                  <span className="text-primary">Metallurgist</span> Pro
                </h1>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Certified Analysis Laboratory</p>
            </div>
            
            <div className="text-center sm:text-right">
              <div className="inline-flex flex-col items-center sm:items-end">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Verification Hash</span>
                <span className="font-mono text-[11px] font-black px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
                  #{report.report_id}
                </span>
              </div>
            </div>
          </header>

          {/* Metadata Grid */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Identity</span>
              <p className="text-sm font-black text-slate-900 uppercase">{report.customer_name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Analysis Date</span>
              <p className="text-sm font-black text-slate-900">{report.date}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact Index</span>
              <p className="text-sm font-mono font-bold text-slate-600">{report.phone_number}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intake Mass</span>
              <p className="text-sm font-black text-slate-900">{report.gold_weight} g</p>
            </div>
          </section>

          {/* Analysis Data Table */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Spectrometric Breakdown</h3>
            </div>
            
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/50">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100/50">
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Metal</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Sym</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Value (%)</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 border-l border-slate-100">Metal</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Sym</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Value (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.metalRows.map((row: any, idx: number) => (
                    <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-900">{row.col1.metal}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-500">{row.col1.symbol}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-mono font-black text-slate-900">{row.col1.value}</td>
                      
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-900 border-l border-slate-100">
                        {row.col2 ? row.col2.metal : <span className="text-slate-200">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.col2 ? (
                          <span className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-500">{row.col2.symbol}</span>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-mono font-black text-slate-900">
                        {row.col2 ? row.col2.value : <span className="text-slate-200">0.000</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer Summary */}
          <footer className="pt-12 border-t-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticity State</p>
                <p className="text-[11px] font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  Digitally Verified & Locked
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </p>
              </div>
            </div>

            <div className="text-center md:text-right space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Atomic Aggregate</span>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{report.total_aggregate}%</p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Gold Purity Index</span>
                <span className="text-[11px] font-black text-primary">{report.purity_percentage}%</span>
              </div>
            </div>
          </footer>

          <div className="text-center pt-8">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
              metallurgist.pro secure analysis node
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicReportPage;
