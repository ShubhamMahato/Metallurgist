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
    <div className="min-h-screen bg-[#E4E3E0] p-4 sm:p-8 flex items-center justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-[#141414] overflow-hidden"
      >
        <div className="bg-[#141414] p-6 text-[#E4E3E0] relative border-b border-[#141414]">
          <button 
            onClick={() => navigate('/')}
            className="absolute left-4 top-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight uppercase italic font-serif">Customer Intake</h1>
            <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest mt-1">Record ID: {crypto.randomUUID().slice(0, 8)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#141414] text-[#E4E3E0] px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-mono"
              >
                <CheckCircle size={14} />
                {successMessage.toUpperCase()}
              </motion.div>
            )}

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-mono"
              >
                <AlertCircle size={14} />
                {errorMessage.toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-serif italic opacity-50 uppercase tracking-widest ml-1">
                Customer Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#141414]/30 group-focus-within:text-[#141414] transition-colors">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#E4E3E0]/30 border border-[#141414]/10 focus:border-[#141414] focus:ring-0 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-[#141414] transition-all outline-none"
                  placeholder="NAME"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-serif italic opacity-50 uppercase tracking-widest ml-1">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#141414]/30 group-focus-within:text-[#141414] transition-colors">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#E4E3E0]/30 border border-[#141414]/10 focus:border-[#141414] focus:ring-0 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-[#141414] transition-all outline-none"
                  placeholder="PHONE"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-serif italic opacity-50 uppercase tracking-widest ml-1">
                Gold Weight (g)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#141414]/30 group-focus-within:text-[#141414] transition-colors">
                  <Weight size={16} />
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={goldWeight}
                  onChange={(e) => setGoldWeight(e.target.value)}
                  className="w-full bg-[#E4E3E0]/30 border border-[#141414]/10 focus:border-[#141414] focus:ring-0 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-[#141414] transition-all outline-none"
                  placeholder="0.000"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-[#141414] ${
              isLoading 
                ? 'bg-[#E4E3E0] text-[#141414]/30 cursor-not-allowed' 
                : 'bg-[#141414] text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] active:scale-[0.98]'
            }`}
          >
            {isLoading ? 'PROCESSING...' : 'SUBMIT INTAKE'}
          </button>
        </form>
        
        <div className="p-4 bg-[#E4E3E0]/10 border-t border-[#141414]/5 text-center">
          <p className="text-[8px] font-mono text-[#141414]/40 uppercase tracking-[0.2em]">
            Metallurgist Pro System v1.0.4 // Secure Data Entry
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default IntakePage;
