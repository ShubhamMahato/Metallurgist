import React, { useState } from 'react';
import { useCreateIntakeMutation } from '../store/apiSlice';
import { User, Phone, Weight, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

const IntakePage: React.FC = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useLanguage();

  const [createIntake, { isLoading }] = useCreateIntakeMutation();
  const navigate = useNavigate();

  // Get user_id or userId from URL params if present
  const queryParams = new URLSearchParams(window.location.search);
  const externalUserId = queryParams.get('user_id') || queryParams.get('userId');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAuthenticated = !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!externalUserId && !isAuthenticated) {
      setErrorMessage('Authorization required. Use the link provided by your lab.');
      return;
    }

    if (!name || !phoneNumber || !goldWeight) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    try {
      const result = await createIntake({
        name,
        phoneNumber,
        goldWeight: parseFloat(goldWeight),
        userId: externalUserId || undefined,
      }).unwrap();

      setSuccessMessage(result.message);
      setName('');
      setPhoneNumber('');
      setGoldWeight('');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to record intake. Please try again.');
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 text-center border border-slate-100"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Record Submitted</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            {successMessage}
          </p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            Submit Another Record
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[460px] w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100"
      >
        <div className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Intake</h1>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Laboratory Entry Point</p>
            </div>
            {(isAuthenticated && !externalUserId) && (
              <button 
                onClick={() => navigate('/')}
                className="p-3 bg-slate-50 text-slate-400 hover:text-primary rounded-2xl transition-all"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-50 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-3"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 py-4 px-6 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-slate-300"
                    placeholder="Enter customer name"
                    required
                  />
                  <User size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 py-4 px-6 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-slate-300"
                      placeholder="+91..."
                      required
                    />
                    <Phone size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Gold Weight (g)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      value={goldWeight}
                      onChange={(e) => setGoldWeight(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 py-4 px-6 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-slate-300"
                      placeholder="0.000"
                      required
                    />
                    <Weight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-5 px-8 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Submit Intake Record'
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Metallurgist Pro</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span>Secure Terminal</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntakePage;
