import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { Timer, Award, User, CheckCircle2, XCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GameSession, Player, Question } from '../types';
import { QUESTION_BANK } from '../questions';

import useSound from 'use-sound';

interface PlayerGameProps {
  session: GameSession;
  player: Player;
  isHost: boolean;
  onCorrect: () => void;
}

export default function PlayerGame({ session, player, isHost, onCorrect }: PlayerGameProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  const [playWinner] = useSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');

  // Play winner sound for host when winnerRecord is first updated
  useEffect(() => {
    if (isHost && session.winnerRecord) {
      playWinner();
    }
  }, [session.winnerRecord?.playerId, isHost]);

  const questionId = session.questionIds[session.currentQuestionIndex];
  const question = QUESTION_BANK.find(q => q.id === questionId)!;

  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(20);
  }, [session.currentQuestionIndex]);

  useEffect(() => {
    if (session.status !== 'QUESTION' || isAnswered || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            handleTimeUp();
            return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session.status, isAnswered, timeLeft]);

  const handleTimeUp = () => {
    if (!isAnswered && !isHost) {
        setIsAnswered(true);
        // Minimal update for attendance? Or just let it be
    }
  };

  const handleAnswer = async (index: number) => {
    if (isAnswered || isHost) return;
    
    setIsAnswered(true);
    setSelectedOption(index);
    const timeTaken = 20 - timeLeft;
    const isCorrect = index === question.correctIndex;

    try {
      if (isCorrect) {
        onCorrect();
        // Atomic transaction for score and fastest record
        await runTransaction(db, async (transaction) => {
          const sessionRef = doc(db, 'sessions', session.id);
          const playerRef = doc(db, 'sessions', session.id, 'players', player.id);
          
          const sessionSnap = await transaction.get(sessionRef);
          const currentWinner = sessionSnap.data()?.winnerRecord;

          // Points: 10 base + bonus for speed (max 10)
          const speedBonus = Math.max(0, 10 - timeTaken);
          const points = 10 + Math.ceil(speedBonus);

          transaction.update(playerRef, {
            score: increment(points),
            correctAnswers: increment(1),
            totalTime: increment(timeTaken)
          });

          // Check if faster or first
          if (!currentWinner || timeTaken < currentWinner.timeTaken) {
            transaction.update(sessionRef, {
              winnerRecord: {
                playerId: player.id,
                playerName: player.name,
                timeTaken: timeTaken
              }
            });
          }
        });
      } else {
         await updateDoc(doc(db, 'sessions', session.id, 'players', player.id), {
            totalTime: increment(timeTaken)
         });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'answer');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 w-full max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="w-full flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full algeria-gradient flex items-center justify-center font-bold">
            {session.currentQuestionIndex + 1}
          </div>
          <span className="text-sm font-bold text-gray-400">من {session.questionCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-[#c5a059]'}`} />
          <span className={`text-2xl font-black ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
        </div>
      </div>

      {/* Winner Alert (Real-time) */}
      <AnimatePresence>
        {session.winnerRecord && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-full algeria-gradient p-3 rounded-xl flex items-center justify-center gap-3 shadow-lg border border-white/20"
          >
            <Award className="w-6 h-6 text-yellow-300" />
            <p className="font-bold text-white">
              الأسرع حتى الآن: {session.winnerRecord.playerName} ({session.winnerRecord.timeTaken.toFixed(1)} ث)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Card */}
      <motion.div
        key={session.currentQuestionIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="luxury-card w-full p-8 rounded-3xl text-center space-y-8"
      >
        <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight">
          {question.text}
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {question.options.map((option, idx) => {
            const isCorrect = idx === question.correctIndex;
            const isSelected = selectedOption === idx;
            const showCorrect = isAnswered || session.status === 'REVEAL';

            let buttonClass = "w-full p-5 rounded-2xl text-xl font-bold transition-all text-right flex items-center justify-between border-2 ";
            
            if (showCorrect) {
              if (isCorrect) buttonClass += "bg-emerald-500/20 border-emerald-500 text-emerald-400";
              else if (isSelected) buttonClass += "bg-red-500/20 border-red-500 text-red-400";
              else buttonClass += "bg-white/5 border-white/5 opacity-50";
            } else {
              buttonClass += "bg-white/5 border-white/5 hover:bg-white/10 hover:border-[#c5a059]/50";
            }

            return (
              <motion.button
                key={idx}
                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(idx)}
                disabled={isAnswered || isHost}
                className={buttonClass}
              >
                <span>{option}</span>
                {showCorrect && isCorrect && <CheckCircle2 className="w-6 h-6" />}
                {showCorrect && isSelected && !isCorrect && <XCircle className="w-6 h-6" />}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Explanation (Reveal only) */}
      <AnimatePresence>
        {(session.status === 'REVEAL' || isAnswered) && question.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full bg-[#c5a059]/10 p-6 rounded-2xl border border-[#c5a059]/30 italic text-center"
          >
            <p className="text-[#c5a059] font-medium">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Action */}
      {isHost && (
        <button
          onClick={() => {
            updateDoc(doc(db, 'sessions', session.id), { status: 'LEADERBOARD' });
          }}
          className="algeria-gradient text-white px-12 py-4 rounded-full text-xl font-bold shadow-xl mt-8"
        >
          عرض النتائج الحالية
        </button>
      )}
    </div>
  );
}
