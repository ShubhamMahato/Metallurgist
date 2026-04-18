import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserCircle, Lock, ArrowLeft, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { useRegisterMutation } from '../store/apiSlice';

interface RegisterProps {
  onRegister: (user: any) => void;
  onNavigateToLogin: () => void;
}

export default function Register({ onRegister, onNavigateToLogin }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [register, { isLoading, error }] = useRegisterMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await register({ name, email, phoneNumber, password }).unwrap();
      localStorage.setItem('user', JSON.stringify(user));
      onRegister(user);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

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

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle size={14} />
                {(error as any).data?.message || 'Registration failed'}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-secondary transition-colors">
                  <UserCircle size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                placeholder="technician@foundry.lab"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Phone Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline-variant group-focus-within:text-secondary transition-colors">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                  placeholder="+91 98765-43210"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-secondary transition-all font-body text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Request Access"}
              {!isLoading && <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
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
