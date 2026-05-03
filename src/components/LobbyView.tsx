import React from 'react';
import { motion } from 'motion/react';
import { Users, Play, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GameSession, Player } from '../types';

interface LobbyViewProps {
  session: GameSession;
  players: Player[];
  isHost: boolean;
  onStart: () => void;
}

export default function LobbyView({ session, players, isHost, onStart }: LobbyViewProps) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?code=${session.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('تم نسخ رابط الانضمام المباشر');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center space-y-12"
    >
      <div className="flex flex-col md:flex-row gap-8 items-center w-full">
        {/* Connection Info */}
        <div className="luxury-card rounded-2xl p-8 flex-1 flex flex-col items-center space-y-6 w-full text-center">
          <div className="space-y-1">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">كود الانضمام</p>
            <h2 className="text-6xl font-black text-[#c5a059] tracking-widest">{session.id}</h2>
          </div>
          
          <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] border-4 border-[#c5a059]">
            <QRCodeSVG value={shareUrl} size={180} />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={copyLink}
              className="px-6 py-2 rounded-full border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059] hover:text-white transition-all flex items-center gap-2 font-bold"
            >
              <Copy className="w-4 h-4" />
              نسخ الرابط
            </button>
          </div>
        </div>

        {/* Players Lobby */}
        <div className="luxury-card rounded-2xl p-8 flex-1 w-full min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#c5a059]" />
              <h3 className="text-xl font-bold">المشاركون</h3>
            </div>
            <span className="bg-[#c5a059]/20 text-[#c5a059] px-3 py-1 rounded-full text-sm font-bold">
              {players.length} متصل
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] custom-scrollbar">
            {players.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 p-3 rounded-lg flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <span className="font-medium">{p.name} {p.isHost && "(المضيف)"}</span>
              </motion.div>
            ))}
            {players.length === 0 && (
              <p className="text-gray-500 text-center mt-12">بانتظار دخول اللاعبين...</p>
            )}
          </div>
        </div>
      </div>

      {isHost ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          disabled={players.length < 1}
          className="algeria-gradient text-white px-16 py-5 rounded-full text-2xl font-black shadow-[0_0_40px_rgba(0,98,51,0.4)] hover:shadow-[0_0_60px_rgba(0,98,51,0.6)] transition-all flex items-center gap-4 disabled:opacity-50"
        >
          <Play className="w-8 h-8 fill-current" />
          ابدأ المسابقة
        </motion.button>
      ) : (
        <div className="text-center space-y-4">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
            <p className="text-xl font-serif text-[#c5a059]">بانتظار المضيف لبدء الثورة...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
