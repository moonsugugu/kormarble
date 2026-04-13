
import React from 'react';
import { Player } from '../types';

interface GameOverModalProps {
  winner: Player;
  reason: string;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, reason, onRestart }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center border-8 border-amber-400 transform transition-all animate-jump-in">
        <h1 className="text-5xl font-black text-amber-800 mb-4 drop-shadow-lg">게임 종료!</h1>
        
        <div className="flex flex-col items-center my-6">
            <div className={`w-24 h-24 rounded-full ${winner.color} border-4 border-white shadow-2xl mb-3`}></div>
            <p className="text-4xl font-bold text-gray-800">{winner.name}의 승리!</p>
        </div>

        <div className="text-lg text-gray-700 my-6 bg-amber-100/70 p-4 rounded-lg border-2 border-amber-200">
          <p>📜 {reason}</p>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-orange-500 text-white font-bold py-4 px-6 rounded-xl text-2xl hover:bg-orange-600 transition-transform transform hover:scale-105 shadow-lg"
        >
          새 게임 시작하기
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
