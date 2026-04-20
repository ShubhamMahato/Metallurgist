import React, { useState } from 'react';
import { 
  useGetPendingUsersQuery, 
  useGetApprovedUsersQuery,
  useApproveUserMutation,
  useRevokeUserMutation
} from '../../store/apiSlice';
import { useLanguage } from '../../lib/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, UserX, Clock, Mail, Phone, Shield, Search, CheckCircle2, XCircle } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  
  const { data: pendingUsers = [], isLoading: isPendingLoading } = useGetPendingUsersQuery();
  const { data: approvedUsers = [], isLoading: isApprovedLoading } = useGetApprovedUsersQuery();
  const [approveUser, { isLoading: isApproving }] = useApproveUserMutation();
  const [revokeUser, { isLoading: isRevoking }] = useRevokeUserMutation();

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId).unwrap();
    } catch (err) {
      console.error("Failed to approve user:", err);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!window.confirm("Are you sure you want to revoke access for this user? They will be immediately disconnected.")) {
      return;
    }
    try {
      await revokeUser(userId).unwrap();
    } catch (err) {
      console.error("Failed to revoke user:", err);
    }
  };

  if (isPendingLoading || isApprovedLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-mono text-outline-variant uppercase tracking-widest">{t('syncing')}</p>
      </div>
    );
  }

  const currentUsers = activeTab === 'pending' ? pendingUsers : approvedUsers;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">
              {t('adminPanel')}
            </h2>
            <p className="text-[10px] font-mono text-outline-variant uppercase tracking-widest font-bold">
              Secure Laboratory Oversight
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-surface-container-high rounded-2xl border border-outline-variant/30">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'pending'
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "text-outline hover:text-on-surface"
            }`}
          >
            <Clock size={14} />
            Pending ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'approved'
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "text-outline hover:text-on-surface"
            }`}
          >
            <CheckCircle2 size={14} />
            Approved ({approvedUsers.length})
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {currentUsers.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface-container-lowest border-2 border-dashed border-outline-variant/20 rounded-3xl p-16 text-center"
          >
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 text-outline-variant">
              <Search size={24} />
            </div>
            <h3 className="text-sm font-black text-on-surface uppercase mb-1">Clear Slate</h3>
            <p className="text-xs font-medium text-outline-variant italic">
              No {activeTab} users found in the laboratory registry.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="grid gap-4"
          >
            {currentUsers.map((user) => (
              <motion.div
                layout
                key={user.id}
                className="bg-white border border-outline-variant/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black uppercase transition-all ${
                    activeTab === 'approved' 
                      ? "bg-green-50 text-green-600 group-hover:bg-green-100" 
                      : "bg-orange-50 text-orange-600 group-hover:bg-orange-100"
                  }`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">{user.name}</h4>
                      {user.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase">Staff</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                        <Mail size={12} className="opacity-50" /> {user.email}
                      </span>
                      {user.phone_number && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                          <Phone size={12} className="opacity-50" /> {user.phone_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                        <Clock size={12} className="opacity-50" /> {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === 'pending' ? (
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={isApproving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      <UserCheck size={14} />
                      {t('approve')}
                    </button>
                  ) : (
                    user.role !== 'admin' && (
                      <button
                        onClick={() => handleRevoke(user.id)}
                        disabled={isRevoking}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        <UserX size={14} />
                        Deactivate
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
