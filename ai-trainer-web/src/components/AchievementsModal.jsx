import React from "react";

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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none font-sans">
      <div className="w-full max-w-2xl bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 relative shadow-[0_0_60px_rgba(0,82,255,0.25)] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#14141c]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                GAMIFICATION // PROTOCOL
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white mt-1">
              ACHIEVEMENTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">// MILESTONES</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
              {unlockedCount} OF {badges.length} PROTOCOL BADGES UNLOCKED ({progressPercent}%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-black border border-slate-900 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Celebration Banner if a badge was just unlocked */}
        {newlyUnlockedBadge && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-cyan-950/60 to-black border border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-4 animate-bounce">
            <div className="text-3xl">{getBadgeIcon(newlyUnlockedBadge.icon_name)}</div>
            <div>
              <span className="text-[8px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-900/40 px-2 py-0.5 rounded">
                NEW MILESTONE UNLOCKED!
              </span>
              <h4 className="text-sm font-black text-white uppercase italic mt-0.5">{newlyUnlockedBadge.title}</h4>
              <p className="text-[10px] text-slate-300 font-medium">{newlyUnlockedBadge.description}</p>
            </div>
          </div>
        )}

        {/* Badges Grid */}
        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
          {badges.map((badge) => {
            const isUnlocked = badge.unlocked;
            return (
              <div
                key={badge.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  isUnlocked
                    ? "bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black border-cyan-400/80 shadow-[0_0_18px_rgba(0,240,255,0.15)]"
                    : "bg-[#07070a] border-slate-900/80 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                    isUnlocked
                      ? "bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_#00F0FF]"
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
                        <span className="text-[8px] font-black tracking-widest bg-cyan-400 text-black px-2 py-0.5 rounded-full uppercase">
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
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#14141c] text-center">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition hover:opacity-90 shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
          >
            RETURN TO CONSOLE →
          </button>
        </div>

      </div>
    </div>
  );
}
