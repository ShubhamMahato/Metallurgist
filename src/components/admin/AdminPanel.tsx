import React from 'react';
import { useGetPendingUsersQuery, useApproveUserMutation } from '../../store/apiSlice';
import { useLanguage } from '../../lib/LanguageContext';
import { motion } from 'motion/react';
import { UserCheck, Clock, Mail, Phone, Shield } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const { data: pendingUsers = [], isLoading, refetch } = useGetPendingUsersQuery();
  const [approveUser, { isLoading: isApproving }] = useApproveUserMutation();

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to approve user:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-mono text-outline-variant uppercase tracking-widest">{t('syncing')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">
            {t('adminPanel')}
          </h2>
          <p className="text-xs font-mono text-outline-variant uppercase tracking-widest">
            {t('pendingUsers')}
          </p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant/20 rounded-3xl p-12 text-center">
          <p className="text-sm font-bold text-on-surface-variant italic">No pending approval requests at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <motion.div
              layout
              key={user.id}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-outline-variant group-hover:bg-primary/5 group-hover:text-primary transition-all">
                  <div className="text-xl font-black uppercase">{user.name.charAt(0)}</div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">{user.name}</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                      <Mail size={12} /> {user.email}
                    </span>
                    {user.phone_number && (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                        <Phone size={12} /> {user.phone_number}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-outline-variant">
                      <Clock size={12} /> {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApprove(user.id)}
                disabled={isApproving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
              >
                <UserCheck size={14} />
                {t('approve')}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
