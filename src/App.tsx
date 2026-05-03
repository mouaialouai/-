/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, doc, setDoc, updateDoc, onSnapshot, getDoc, 
  query, where, orderBy, limit, deleteDoc, getDocs, runTransaction,
  increment, serverTimestamp 
} from 'firebase/firestore';
import { 
  signInAnonymously, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
  Trophy, Users, Play, LogIn, ChevronRight, RefreshCcw, 
  Settings, History, Award, Timer, Target, CheckCircle2, XCircle,
  Globe, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import useSound from 'use-sound';
import { QRCodeSVG } from 'qrcode.react';

import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { Question, GameSession, Player, AnswerRecord, SessionStatus } from './types';
import { QUESTION_BANK } from './questions';

// Components
import LobbyView from './components/LobbyView';
import PlayerGame from './components/PlayerGame';
import FinalResults from './components/FinalResults';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<GameSession | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const googleProvider = new GoogleAuthProvider();

  // Sounds (using placeholder URLs or local assets if I had them, but standard use-sound needs paths)
  // For now, I'll define them but they might be silent if URLs are broken
  const [playCorrect] = useSound('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
  const [playWinner] = useSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');

  useEffect(() => {
    // Check for code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !sessionId) {
      setSessionId(code.toUpperCase());
    }

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // If we have a user and they're not in the session yet, we'll wait for them to click join
    });
  }, [sessionId]);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      setAuthError(null);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-blocked') {
        alert('يرجى السماح بالنوافذ المنبثقة (Popups) في متصفحك لتتمكن من تسجيل الدخول.');
      } else {
        setAuthError("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    if (user) return user;
    return await loginWithGoogle().then(() => auth.currentUser);
  };

  // Listen to Session
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        setSession({ id: doc.id, ...doc.data() } as GameSession);
      } else {
        setSession(null);
        setSessionId('');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}`));
    return unsub;
  }, [sessionId]);

  // Listen to Players
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'sessions', sessionId, 'players'), orderBy('score', 'desc'), orderBy('totalTime', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const playersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      setAllPlayers(playersList);
      const currentPlayer = playersList.find(p => p.id === user?.uid);
      if (currentPlayer) setPlayer(currentPlayer);
    }, (error) => handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}/players`));
    return unsub;
  }, [sessionId, user]);

  const createSession = async (count: number) => {
    try {
      setLoading(true);
      const res = await authenticate();
      const sId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Select random questions
      const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count).map(q => q.id);

      const sessionData: GameSession = {
        id: sId,
        hostId: res.uid,
        status: 'LOBBY',
        currentQuestionIndex: 0,
        questionCount: count,
        questionIds: selected,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'sessions', sId), sessionData);
      
      const hostPlayer: Player = {
        id: res.uid,
        name: playerName || 'المضيف',
        score: 0,
        correctAnswers: 0,
        totalTime: 0,
        joinedAt: Date.now(),
        isHost: true
      };

      await setDoc(doc(db, 'sessions', sId, 'players', res.uid), hostPlayer);
      
      setIsHost(true);
      setSessionId(sId);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const joinSession = async (id: string, name: string) => {
    try {
      setLoading(true);
      const res = await authenticate();
      const sessionDoc = await getDoc(doc(db, 'sessions', id));
      
      if (!sessionDoc.exists()) {
        alert('المسابقة غير موجودة');
        setLoading(false);
        return;
      }

      const playerDoc: Player = {
        id: res.uid,
        name: name,
        score: 0,
        correctAnswers: 0,
        totalTime: 0,
        joinedAt: Date.now(),
        isHost: false
      };

      await setDoc(doc(db, 'sessions', id, 'players', res.uid), playerDoc);
      setSessionId(id);
      setIsHost(false);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0f19]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c5a059]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4">
      {/* Global Header Actions */}
      {sessionId && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button 
            onClick={() => {
              if (confirm('هل أنت متأكد من الخروج والعودة للرئيسية؟')) {
                setSessionId('');
                window.history.replaceState({}, '', window.location.pathname);
              }
            }}
            className="flex items-center gap-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 px-4 py-2 rounded-full transition-all text-sm font-bold backdrop-blur-md"
          >
            <RotateCcw className="w-4 h-4" />
            الرئيسية
          </button>
        </div>
      )}

      {/* Login Screen Overlay */}
      {!user && !loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="luxury-card p-10 rounded-[3rem] max-w-md w-full text-center space-y-8 border border-[#c5a059]"
          >
            <div className="space-y-4">
               <Trophy className="w-20 h-20 text-[#c5a059] mx-auto animate-bounce" />
               <h2 className="text-4xl font-serif font-black algeria-text-gradient">ثورة الأحرار</h2>
               <p className="text-gray-400 leading-relaxed">
                 للمشاركة في المنافسة التاريخية، يرجى تسجيل الدخول باستخدام حساب جوجل الخاص بك.
               </p>
            </div>
            
            <button 
              onClick={loginWithGoogle}
              className="w-full bg-[#c5a059] text-white py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-[#b08d48] transition-all shadow-[0_0_30px_rgba(197,160,89,0.3)]"
            >
              <Globe className="w-6 h-6" />
              الدخول باستخدام جوجل
            </button>
            
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
          </motion.div>
        </div>
      )}

      {/* Host Admin Badge */}
      {isHost && sessionId && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-[#c5a059] text-white px-4 py-2 rounded-full font-bold shadow-lg text-xs md:text-sm">
          <Settings className="w-4 h-4" />
          لوحة تحكم الأستاذ: عادل موايعية
        </div>
      )}

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#006233] blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#d21034] blur-[120px]" />
      </div>

      <main className="max-w-4xl mx-auto relative z-10 pt-8 pb-12">
        {!sessionId ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-12 text-center"
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-serif font-black algeria-text-gradient tracking-tight">
                ثورة الأحرار
              </h1>
              <p className="text-xl text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
                مسابقة تاريخية تفاعلية حول كفاح الشعب الجزائري من أجل الاستقلال (1830 - 1962)
              </p>
              <div className="pt-2">
                <p className="text-sm font-semibold tracking-widest text-[#c5a059] border-y border-[#c5a059]/20 py-2">
                  تصميم وإعداد الأستاذ: عادل موايعية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {/* Create Card */}
              <div className="luxury-card rounded-2xl p-8 flex flex-col items-center space-y-6">
                <div className="w-16 h-16 rounded-full algeria-gradient flex items-center justify-center shadow-lg">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">ابدأ مسابقة جديدة</h2>
                  <p className="text-sm text-gray-400 text-center">كن أنت المضيف وشارك الكود مع الآخرين</p>
                </div>
                <div className="w-full space-y-4">
                  <input
                    type="text"
                    placeholder="اسمك الكريم"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#c5a059] transition-all text-center"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 30].map(count => (
                      <button
                        key={count}
                        onClick={() => createSession(count)}
                        className="bg-white/10 hover:bg-[#c5a059] text-white py-2 rounded-lg transition-all text-sm font-bold"
                      >
                        {count} سؤال
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Join Card */}
              <div className="luxury-card rounded-2xl p-8 flex flex-col items-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <LogIn className="w-8 h-8 text-[#c5a059]" />
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold text-white">انضم إلى مسابقة</h2>
                  <p className="text-sm text-gray-400">ادخل الكود لمنافسة زملائك</p>
                </div>
                <div className="w-full space-y-4">
                    <input
                      type="text"
                      placeholder="اسمك الكريم"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#c5a059] transition-all text-center"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="كود المسابقة"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#c5a059] transition-all text-center font-mono uppercase"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                      />
                      <button
                        onClick={() => joinSession(sessionId, playerName)}
                        disabled={!sessionId || !playerName}
                        className="bg-[#c5a059] hover:bg-[#b08d48] disabled:opacity-50 text-white px-6 rounded-xl transition-all font-bold"
                      >
                        دخول
                      </button>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 font-medium">
              تاريخ الجزائر أمانة في أعناقنا • 1830 - 1962
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {(!player && sessionId) ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="luxury-card p-8 rounded-3xl max-w-md mx-auto text-center space-y-6"
              >
                <div className="space-y-2">
                   <h2 className="text-2xl font-bold">الانضمام للمسابقة</h2>
                   <p className="text-gray-400">لقد تمت دعوتك للمسابقة بكود: <span className="text-[#c5a059] font-black">{sessionId}</span></p>
                </div>
                <input
                    type="text"
                    placeholder="اكتب اسمك الكريم هنا"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#c5a059] transition-all text-center text-xl"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
                <button
                    onClick={() => joinSession(sessionId, playerName)}
                    disabled={!playerName}
                    className="w-full algeria-gradient text-white py-4 rounded-xl font-black text-xl disabled:opacity-50"
                >
                    دخول الآن
                </button>
              </motion.div>
            ) : session?.status === 'LOBBY' ? (
              <LobbyView 
                session={session} 
                players={allPlayers} 
                isHost={isHost} 
                onStart={() => updateDoc(doc(db, 'sessions', sessionId), { status: 'QUESTION' })}
              />
            ) : (session?.status === 'QUESTION' || session?.status === 'REVEAL') ? (
              <PlayerGame 
                session={session} 
                player={player!} 
                isHost={isHost}
                onCorrect={() => playCorrect()}
              />
            ) : session?.status === 'LEADERBOARD' ? (
              <div className="flex flex-col items-center space-y-8">
                <h2 className="text-4xl font-bold algeria-text-gradient">المتصدرون حالياً</h2>
                <div className="w-full space-y-4">
                  {allPlayers.slice(0, 10).map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`luxury-card p-4 rounded-xl flex items-center justify-between ${p.id === user?.uid ? 'border-[#c5a059] bg-[#c5a059]/10' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-[#c5a059] w-8">#{idx + 1}</span>
                        <span className="text-xl font-bold">{p.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black">{p.score} نقطة</span>
                        <span className="text-xs text-gray-400">{p.correctAnswers} إجابة صحيحة</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {isHost && (
                  <button
                    onClick={() => {
                        const nextIdx = session.currentQuestionIndex + 1;
                        if (nextIdx >= session.questionCount) {
                            updateDoc(doc(db, 'sessions', sessionId), { status: 'FINAL_RESULTS' });
                        } else {
                            updateDoc(doc(db, 'sessions', sessionId), { 
                                status: 'QUESTION',
                                currentQuestionIndex: nextIdx,
                                winnerRecord: null,
                                questionStartTime: Date.now()
                            });
                        }
                    }}
                    className="algeria-gradient hover:opacity-90 text-white px-12 py-4 rounded-full text-xl font-bold shadow-xl transition-all"
                  >
                    السؤال التالي
                  </button>
                )}
              </div>
            ) : session?.status === 'FINAL_RESULTS' ? (
              <FinalResults 
                players={allPlayers} 
                onReset={() => {
                   setSessionId('');
                   window.history.replaceState({}, '', window.location.pathname);
                }}
                isHost={isHost}
              />
            ) : null}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

