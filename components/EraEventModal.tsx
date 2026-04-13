import React from 'react';
import { EraEvent } from '../types';

interface EraEventModalProps {
  event: EraEvent;
  onClose: () => void;
}

const EraEventModal: React.FC<EraEventModalProps> = ({ event, onClose }) => {
  let effectText = '';
  switch(event.effect) {
      case 'TOLL_DISCOUNT_20': effectText = '모든 통행료가 20% 할인됩니다.'; break;
      case 'CONSTRUCTION_COST_UP_50': effectText = '모든 도시 구매 및 성장 비용이 50% 증가합니다.'; break;
      case 'CHANCE_BECOMES_TRAVEL': effectText = '모든 \'행운의 주사위\' 칸이 \'순간이동\' 칸으로 변경됩니다.'; break;
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-indigo-50 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-indigo-300 transform transition-all animate-jump-in">
        <h2 className="text-4xl font-black text-indigo-800 mb-4 drop-shadow-lg">🌊 시대의 흐름!</h2>
        
        <div className="text-lg text-indigo-700 my-6 bg-white/70 p-4 rounded-lg border-2 border-indigo-200">
          <p className="font-bold text-xl mb-2">"{event.description}"</p>
          <p>{effectText}</p>
          <p className="font-semibold mt-2">(효과는 {event.duration}라운드 동안 지속됩니다)</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-indigo-600 transition shadow-md"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default EraEventModal;
