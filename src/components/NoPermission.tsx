import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface NoPermissionProps {
  onBack: () => void;
}

export default function NoPermission({ onBack }: NoPermissionProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white paper-shadow rounded-2xl overflow-hidden text-center"
      >
        <div className="p-8 sm:p-12">
          <div className="w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <ShieldAlert size={40} />
          </div>

          <h1 className="text-2xl font-bold font-headline text-slate-900 tracking-tighter mb-4">Access Denied</h1>
          <p className="text-on-surface-variant text-sm mb-10">
            You do not have the required permissions to access this laboratory module. 
            Please contact your system administrator to request elevated privileges.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-surface-container-low rounded-lg flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-outline shadow-sm">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Required Role</p>
                <p className="text-sm font-medium text-on-surface">Senior Metallurgist</p>
              </div>
            </div>

            <button 
              onClick={onBack}
              className="w-full py-4 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Return to Dashboard
            </button>
          </div>
        </div>
        
        <div className="bg-surface-container-low px-8 py-4 border-t border-outline-variant/10 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Security Incident Logged: #SC-ERR-403
          </p>
        </div>
      </motion.div>
    </div>
  );
}
