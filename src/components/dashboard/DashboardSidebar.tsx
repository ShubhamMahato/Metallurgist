import React from "react";
import {
  Users,
  X,
  Search,
  CheckCircle2,
  UserPlus,
  Activity,
  Coins,
  ShieldCheck,
  Zap,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../lib/LanguageContext";

interface DashboardSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  intakeSearch: string;
  setIntakeSearch: (search: string) => void;
  isIntakesLoading: boolean;
  intakes: any[];
  selectedIntakeId: string | null;
  setSelectedIntakeId: (id: string | null) => void;
  isCompleting: boolean;
  completeIntake: (id: string) => Promise<any>;
  onShowIntakeLink: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  intakeSearch,
  setIntakeSearch,
  isIntakesLoading,
  intakes,
  selectedIntakeId,
  setSelectedIntakeId,
  isCompleting,
  completeIntake,
  onShowIntakeLink,
}) => {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* Backdrop - Only on mobile/tablet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60] lg:hidden"
          />

          <motion.aside
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 lg:relative h-full w-full sm:w-[400px] lg:w-[380px] bg-surface-container-lowest shadow-2xl lg:shadow-none z-[70] lg:z-10 border-r border-outline-variant/30 flex flex-col overflow-hidden"
          >
            {/* Drawer Header - Technical Style */}
            <div className="p-6 bg-surface-container-lowest border-b border-outline-variant/30 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-headline text-on-surface uppercase tracking-tighter">
                      {t('customerQueue')}
                    </h3>
                    <p className="text-[9px] font-mono text-outline-variant uppercase tracking-[0.2em]">
                      {t('activeIntake')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-surface-container rounded-xl transition-colors text-outline-variant hover:text-on-surface lg:hidden"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline-variant group-focus-within:text-primary transition-colors">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  value={intakeSearch}
                  onChange={(e) => setIntakeSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-on-surface transition-all outline-none placeholder:text-outline-variant/40 font-mono"
                  placeholder={t('searchPlaceholder')}
                />
              </div>
            </div>

            {/* Drawer Content - Bento List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-surface-container-lowest">
              {isIntakesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[9px] font-mono text-outline-variant uppercase tracking-widest">
                    Syncing Database...
                  </p>
                </div>
              ) : intakes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-outline-variant/10 rounded-3xl">
                  <div className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-outline-variant/20">
                    <Search size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      {t('noPendingIntakes')}
                    </p>
                    <p className="text-[9px] font-mono text-outline-variant uppercase tracking-tight mt-1">
                      {t('checkFilters')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {intakes.map((intake: any) => (
                    <motion.button
                      layout
                      key={intake.id}
                      onClick={() => {
                        setSelectedIntakeId(intake.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group relative overflow-hidden ${
                        selectedIntakeId === intake.id
                          ? "bg-primary/5 border-primary/40 shadow-sm"
                          : "bg-white border-outline-variant/10 hover:border-primary/20 text-on-surface hover:bg-surface-container-lowest"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          selectedIntakeId === intake.id
                            ? "bg-primary text-on-primary rotate-3"
                            : "bg-surface-container-highest text-outline-variant group-hover:text-primary group-hover:bg-primary/5"
                        }`}
                      >
                        {selectedIntakeId === intake.id ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <UserPlus size={18} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={`text-xs font-black uppercase tracking-tight truncate ${
                              selectedIntakeId === intake.id
                                ? "text-primary"
                                : "text-on-surface"
                            }`}
                          >
                            {intake.name}
                          </h4>
                          <span className="text-[8px] font-mono text-outline-variant">
                            {new Date(intake.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-mono text-outline-variant flex items-center gap-1">
                            <Activity size={10} className="opacity-50" />
                            {intake.phone_number}
                          </p>
                          <p className="text-[10px] font-mono text-primary font-bold flex items-center gap-1">
                            <Coins size={10} className="opacity-50" />
                            {intake.gold_weight}g
                          </p>
                        </div>
                      </div>

                      <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                        selectedIntakeId === intake.id
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container text-outline-variant border-outline-variant/20 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                      }`}>
                        {selectedIntakeId === intake.id ? t('linked') : t('link')}
                      </div>

                      {selectedIntakeId === intake.id && (
                        <motion.div
                          layoutId="active-glow"
                          className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer - Information Area */}
            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/30 space-y-4">
              {selectedIntakeId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-secondary uppercase tracking-widest leading-none mb-1">
                      {t('activeLink')}
                    </p>
                    <p className="text-xs font-bold text-on-surface truncate">
                      {intakes.find((i) => i.id === selectedIntakeId)?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedIntakeId(null)}
                    className="p-1.5 hover:bg-secondary/10 rounded-lg text-secondary transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}

              <div className="flex items-center justify-between gap-4 py-4 pt-6 border-t border-outline-variant/10">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container rounded-lg text-[9px] font-black text-outline-variant hover:text-on-surface uppercase tracking-widest transition-all group"
                >
                  <X size={12} className="group-hover:rotate-90 transition-transform" />
                  {t('collapseQueue')}
                </button>
                <div className="flex-1 lg:hidden" />
                <button
                  onClick={onShowIntakeLink}
                  className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary hover:text-white transition-all border border-secondary/20 ml-auto"
                  title="Share Intake Link"
                >
                  <Share2 size={12} />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
