import React from 'react';
import { HistoricalEvent, Player } from '../types';

interface StealPropertyModalProps {
  event: HistoricalEvent;
  stealer: Player;
  victims: Player[];
  onSteal: (victimId: number) => void;
  onClose: () => void;
}

const StealPropertyModal: React.FC<StealPropertyModalProps> = ({ event, stealer, victims, onSteal, onClose }) => {
  const { description } = event;

  const handleSteal = (victimId: number) => {
    onSteal(victimId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-50 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-300 transform transition-all animate-jump-in">
        <h2 className="text-3xl font-bold text-yellow-800">역사 카드: 자산 강탈!</h2>
        <p className="text-lg text-yellow-700 min-h-[4rem] flex items-center justify-center my-4 bg-white/80 p-4 rounded-lg">
          {description}
        </p>
        <p className="text-xl font-semibold text-gray-800 mb-4">
            누구의 가장 저렴한 땅을 빼앗으시겠습니까?
        </p>

        <div className="space-y-3">
            {victims.length > 0 ? victims.map(victim => (
                <button
                    key={victim.id}
                    onClick={() => handleSteal(victim.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white hover:bg-amber-100 border-2 border-amber-200 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${victim.color}`} />
                        <span className="font-bold text-lg text-gray-800">{victim.name} {victim.isAI && '(AI)'}</span>
                    </div>
                    <span className="font-semibold text-lg text-green-700">₩{victim.money.toLocaleString()}</span>
                </button>
            )) : <p className="text-gray-600">빼앗을 땅을 가진 상대가 없습니다.</p>}
        </div>
        {victims.length === 0 && 
            <button onClick={onClose} className="mt-4 w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-orange-600 transition shadow-md">확인</button>
        }
      </div>
    </div>
  );
};

export default StealPropertyModal;
