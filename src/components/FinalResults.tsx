import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Award, RotateCcw, Home, Star } from 'lucide-react';
import { Player } from '../types';

interface FinalResultsProps {
  players: Player[];
  onReset: () => void;
  isHost: boolean;
}

export default function FinalResults({ players, onReset, isHost }: FinalResultsProps) {
  const winner = players[0];

  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center space-y-12 w-full max-w-4xl mx-auto py-8"
    >
      <div className="text-center space-y-4">
        <motion.div
           initial={{ y: 20 }}
           animate={{ y: 0 }}
           className="inline-block p-4 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/20"
        >
          <Trophy className="w-16 h-16 text-[#c5a059]" />
        </motion.div>
        <h1 className="text-6xl font-serif font-black algeria-text-gradient">أبطال التاريخ</h1>
        <p className="text-gray-400 font-medium">نتائج المسابقة النهائية</p>
      </div>

      {/* Top 3 Podium */}
      <div className="flex flex-wrap justify-center items-end gap-4 w-full px-4">
        {players.length > 1 && (
          <div className="flex flex-col items-center">
             <div className="text-center mb-2">
                <p className="font-bold text-gray-400">#2</p>
                <p className="font-bold truncate max-w-[100px]">{players[1].name}</p>
             </div>
             <div className="w-24 h-32 luxury-card rounded-t-xl flex items-end justify-center pb-4 border-b-0">
                <span className="text-2xl font-black text-gray-400">{players[1].score}</span>
             </div>
          </div>
        )}

        {players.length > 0 && (
          <div className="flex flex-col items-center transform -translate-y-4">
             <div className="text-center mb-2">
                <Star className="w-6 h-6 text-[#c5a059] mx-auto animate-pulse" />
                <p className="text-2xl font-black algeria-text-gradient">#1</p>
                <p className="text-xl font-black truncate max-w-[150px]">{players[0].name}</p>
             </div>
             <div className="w-32 h-48 algeria-gradient rounded-t-2xl flex items-end justify-center pb-6 border-b-0 shadow-[0_-20px_50px_rgba(197,160,89,0.3)]">
                <span className="text-4xl font-black text-white">{players[0].score}</span>
             </div>
          </div>
        )}

        {players.length > 2 && (
          <div className="flex flex-col items-center">
             <div className="text-center mb-2">
                <p className="font-bold text-[#b87333]">#3</p>
                <p className="font-bold truncate max-w-[100px]">{players[2].name}</p>
             </div>
             <div className="w-24 h-24 luxury-card rounded-t-xl flex items-end justify-center pb-4 border-b-0">
                <span className="text-2xl font-black text-[#b87333]">{players[2].score}</span>
             </div>
          </div>
        )}
      </div>

      {/* Rest of Leaderboard */}
      <div className="w-full luxury-card rounded-3xl p-8 space-y-4">
        <h3 className="text-xl font-bold border-b border-white/10 pb-4">القائمة الكاملة</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {players.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-lg font-black text-gray-500 w-6">#{idx + 1}</span>
                <span className="font-bold">{p.name}</span>
              </div>
              <div className="text-right">
                <div className="font-black text-[#c5a059]">{p.score} نقطة</div>
                <div className="text-xs text-gray-500">{p.correctAnswers} إجابة صحيحة</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center space-y-8 pt-8">
        <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">تطبيق مسابقة الثورة الجزائرية</p>
            <p className="text-xl font-serif font-black text-[#c5a059]">تصميم وإعداد الأستاذ: عادل موايعية</p>
        </div>

        <button 
          onClick={onReset}
          className="luxury-card hover:bg-white/10 text-white px-8 py-3 rounded-full flex items-center gap-2 transition-all"
        >
          {isHost ? <RotateCcw className="w-5 h-5" /> : <Home className="w-5 h-5" />}
          {isHost ? 'إعادة مسابقة جديدة' : 'العودة للرئيسية'}
        </button>
      </div>
    </motion.div>
  );
}
