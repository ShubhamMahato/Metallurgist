import React, { useState } from 'react';
import { useCreateIntakeMutation } from '../store/apiSlice';
import { User, Phone, Weight, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const IntakePage: React.FC = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createIntake, { isLoading }] = useCreateIntakeMutation();
  const navigate = useNavigate();

  // Get user_id from URL params if present
  const queryParams = new URLSearchParams(window.location.search);
  const externalUserId = queryParams.get('user_id');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!name || !phoneNumber || !goldWeight) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    try {
      const result = await createIntake({
        name,
        phoneNumber,
        goldWeight: parseFloat(goldWeight),
        userId: externalUserId || undefined, // Pass external user id if present
      }).unwrap();

      setSuccessMessage(result.message);
      setName('');
      setPhoneNumber('');
      setGoldWeight('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to record intake. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest p-4 sm:p-8 flex items-center justify-center font-sans selection:bg-primary/30">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-xl w-full bg-surface-container-low rounded-[2rem] shadow-2xl border border-outline-variant/30 overflow-hidden relative"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 blur-3xl -ml-16 -mb-16 rounded-full" />

        <div className="bg-surface-container-highest p-8 text-on-surface relative border-b border-outline-variant/20">
          {!externalUserId && (
            <button 
              onClick={() => navigate('/')}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 hover:bg-surface-container rounded-2xl transition-all border border-transparent hover:border-outline-variant/30 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic font-headline flex items-center justify-center gap-3">
              <span className="text-primary">Customer</span> Intake
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md border border-primary/20">
                Secure Entry
              </span>
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                ID: {crypto.randomUUID().slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 relative">
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-primary/10 border border-primary/20 text-primary px-5 py-4 rounded-2xl flex items-center gap-4 text-xs font-bold shadow-sm"
              >
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-on-primary shrink-0">
                  <CheckCircle size={18} />
                </div>
                <span className="uppercase tracking-wide">{successMessage}</span>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-error/10 border border-error/20 text-error px-5 py-4 rounded-2xl flex items-center gap-4 text-xs font-bold shadow-sm"
              >
                <div className="w-8 h-8 bg-error rounded-xl flex items-center justify-center text-on-error shrink-0">
                  <AlertCircle size={18} />
                </div>
                <span className="uppercase tracking-wide">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-on-surface/60 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                <User size={12} className="text-primary" />
                Customer Full Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 px-5 text-sm font-medium text-on-surface transition-all outline-none placeholder:text-on-surface/20"
                  placeholder="e.g. JOHN DOE"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface/60 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                  <Phone size={12} className="text-primary" />
                  Phone Number
                </label>
                <div className="relative group">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 px-5 text-sm font-medium text-on-surface transition-all outline-none placeholder:text-on-surface/20"
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface/60 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                  <Weight size={12} className="text-primary" />
                  Gold Weight (g)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.001"
                    value={goldWeight}
                    onChange={(e) => setGoldWeight(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 px-5 text-sm font-mono font-medium text-on-surface transition-all outline-none placeholder:text-on-surface/20"
                    placeholder="0.000"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] transition-all overflow-hidden ${
              isLoading 
                ? 'bg-surface-container-highest text-on-surface/30 cursor-not-allowed' 
                : 'bg-primary text-on-primary hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]'
            }`}
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Submit Intake Record
                  <CheckCircle size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </span>
          </button>
        </form>
        
        <div className="p-6 bg-surface-container-highest/30 border-t border-outline-variant/10 text-center">
          <div className="flex items-center justify-center gap-4 text-[9px] font-mono text-on-surface/30 uppercase tracking-[0.25em]">
            <span>System v1.0.5</span>
            <span className="w-1 h-1 bg-on-surface/20 rounded-full" />
            <span>Encrypted Node</span>
            <span className="w-1 h-1 bg-on-surface/20 rounded-full" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntakePage;
