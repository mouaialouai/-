/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type SessionStatus = 'LOBBY' | 'STARTING' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINAL_RESULTS';

export interface GameSession {
  id: string;
  hostId: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  questionCount: number;
  questionIds: string[];
  startTime?: number;
  questionStartTime?: number;
  createdAt: number;
  winnerRecord?: {
    playerId: string;
    playerName: string;
    timeTaken: number;
  } | null;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  correctAnswers: number;
  totalTime: number;
  joinedAt: number;
  isHost: boolean;
}

export interface AnswerRecord {
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  timeTaken: number;
  timestamp: number;
}
