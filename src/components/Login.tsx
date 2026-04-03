import React from 'react';
import { motion } from 'motion/react';
import { UserCircle, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
}

export default function Login({ onLogin, onNavigateToRegister }: LoginProps) {
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
            <p className="text-on-surface-variant text-sm">Access the precision laboratory dashboard.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-secondary transition-colors">
                  <UserCircle size={18} />
                </div>
                <input 
                  type="email" 
                  className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                  placeholder="technician@foundry.lab"
                  required
                />
              </div>
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
              Authenticate
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-on-surface-variant">
              New technician? {' '}
              <button 
                onClick={onNavigateToRegister}
                className="text-secondary font-bold hover:underline"
              >
                Request Access
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
