import React from 'react';
import { motion } from 'motion/react';
import { UserCircle, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface RegisterProps {
  onRegister: () => void;
  onNavigateToLogin: () => void;
}

export default function Register({ onRegister, onNavigateToLogin }: RegisterProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white paper-shadow rounded-2xl overflow-hidden"
      >
        <div className="p-8 sm:p-12">
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-bold font-headline text-slate-900 tracking-tighter mb-2">Metallurgist Pro</h1>
            <p className="text-on-surface-variant text-sm">Request access to the laboratory system.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onRegister(); }}>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-secondary transition-colors">
                  <UserCircle size={18} />
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                  placeholder="Technician Name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address</label>
              <input 
                type="email" 
                className="block w-full px-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                placeholder="technician@foundry.lab"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Security Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-secondary transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 group"
            >
              Request Access
              <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-on-surface-variant">
              Already have access? {' '}
              <button 
                onClick={onNavigateToLogin}
                className="text-secondary font-bold hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                Back to Login
              </button>
            </p>
          </div>
        </div>
        
        <div className="bg-surface-container-low px-8 py-4 border-t border-outline-variant/10 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            System ID: SC-8000 | Secure Node
          </p>
        </div>
      </motion.div>
    </div>
  );
}
