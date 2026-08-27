import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AchievementsModal({ isOpen, onClose, badges, newlyUnlockedBadge }) {
  if (!isOpen) return null;

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const progressPercent = Math.round((unlockedCount / (badges.length || 1)) * 100);

  const getBadgeIcon = (iconName) => {
    switch (iconName) {
      case "sword":
        return "⚔️";
      case "flame":
        return "🔥";
      case "droplet":
        return "💧";
      case "zap":
        return "⚡";
      case "trophy":
        return "🏆";
      default:
        return "🛡️";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-50 select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-2xl bg-[#0a0a0c]/95 border border-white/10 rounded-3xl p-6 sm:p-8 relative shadow-[0_0_80px_rgba(0,240,255,0.2)] max-h-[90vh] flex flex-col overflow-hidden backdrop-blur-2xl"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF]"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none"></div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  GAMIFICATION // PROTOCOL
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white mt-1">
                ACHIEVEMENTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">// MILESTONES</span>
              </h2>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                {unlockedCount} OF {badges.length} PROTOCOL BADGES UNLOCKED ({progressPercent}%)
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 hover:border-cyan-400/50 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Celebration Banner if a badge was just unlocked */}
          {newlyUnlockedBadge && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 via-cyan-950/70 to-black border border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.3)] flex items-center gap-4"
            >
              <div className="text-3xl animate-bounce">{getBadgeIcon(newlyUnlockedBadge.icon_name)}</div>
              <div>
                <span className="text-[8px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-900/40 px-2 py-0.5 rounded border border-cyan-500/30">
                  NEW MILESTONE UNLOCKED!
                </span>
                <h4 className="text-sm font-black text-white uppercase italic mt-0.5">{newlyUnlockedBadge.title}</h4>
                <p className="text-[10px] text-slate-300 font-medium">{newlyUnlockedBadge.description}</p>
              </div>
            </motion.div>
          )}

          {/* Badges Grid */}
          <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
            {badges.map((badge, idx) => {
              const isUnlocked = badge.unlocked;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isUnlocked
                      ? "bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                      : "bg-[#07070a]/80 border-slate-900/80 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                      isUnlocked
                        ? "bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                        : "bg-black border-slate-900 text-slate-600"
                    }`}>
                      {getBadgeIcon(badge.icon_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-black uppercase italic tracking-tight ${
                          isUnlocked ? "text-white" : "text-slate-500"
                        }`}>
                          {badge.title}
                        </h4>
                        {isUnlocked && (
                          <span className="text-[8px] font-black tracking-widest bg-cyan-400 text-black px-2 py-0.5 rounded-full uppercase shadow-[0_0_8px_#00F0FF]">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {isUnlocked ? (
                      <span className="text-[9px] font-bold text-cyan-400 uppercase block tracking-wider">
                        {badge.unlocked_at ? new Date(badge.unlocked_at).toLocaleDateString() : "ACTIVE"}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-900">
                        LOCKED
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <motion.button
              whileHover={{ scale: 1.01, filter: "brightness(1.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition shadow-[0_0_25px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              RETURN TO CONSOLE →
            </motion.button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
