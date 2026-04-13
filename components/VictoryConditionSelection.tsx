
import React from 'react';
import { VictoryCondition } from '../types';

interface VictoryConditionSelectionProps {
  onSelect: (condition: VictoryCondition) => void;
}

const VictoryConditionSelection: React.FC<VictoryConditionSelectionProps> = ({ onSelect }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto text-center border-4 border-amber-300">
      <h1 className="text-5xl font-bold text-amber-800 mb-4">승리 조건을 선택하세요</h1>
      <p className="text-amber-600 mb-10 text-lg">어떤 방식으로 천하를 통일하시겠습니까?</p>
      
      <div className="space-y-6">
        <button
          onClick={() => onSelect({ type: 'DEFAULT' })}
          className="w-full bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-400 transition-all transform hover:scale-105 shadow-lg text-left"
        >
          <h2 className="text-2xl font-bold text-amber-800">기본 규칙</h2>
          <p className="text-gray-600 mt-2">상대방을 모두 파산시키거나, 한 라인의 모든 땅을 독점하면 승리합니다.</p>
        </button>
        
        <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 shadow-lg text-left">
           <h2 className="text-2xl font-bold text-amber-800">시간제한 규칙</h2>
           <p className="text-gray-600 mt-2 mb-4">정해진 시간 동안 가장 많은 자산(현금 + 부동산)을 모은 플레이어가 승리합니다.</p>
           <div className="flex justify-center items-center gap-4">
                {[5, 10, 15].map(time => (
                    <button
                        key={time}
                        onClick={() => onSelect({ type: 'TIME', duration: time as 5 | 10 | 15 })}
                        className="flex-1 bg-orange-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-orange-600 transition shadow-md"
                    >
                        {time}분
                    </button>
                ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default VictoryConditionSelection;
