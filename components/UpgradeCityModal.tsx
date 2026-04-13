import React from 'react';
import { BoardSpace, Player } from '../types';

interface UpgradeCityModalProps {
  city: BoardSpace;
  player: Player;
  onUpgrade: () => void;
  onClose: () => void;
}

const UpgradeCityModal: React.FC<UpgradeCityModalProps> = ({ city, player, onUpgrade, onClose }) => {
  const currentMultiplier = city.multiplier || 1;
  const upgradeCost = Math.floor((city.price || 0) / 2);
  const canAfford = player.money >= upgradeCost;
  const isMaxLevel = currentMultiplier >= 3;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border-4 border-amber-300 transform transition-all animate-jump-in">
        <h2 className="text-3xl font-bold text-amber-800 mb-2">⭐ 내 땅 도착!</h2>
        <p className="text-lg text-amber-600 mb-4">{city.name}을(를) 성장시킬까요?</p>

        <div className="bg-white/80 rounded-lg p-4 mb-6 text-left space-y-2">
            <div>
                <span className="font-semibold text-gray-700">현재 레벨:</span>
                <span className="font-bold text-xl text-yellow-600 ml-2">
                    {[...Array(currentMultiplier)].map((_, i) => '⭐').join('')} (통행료 X{currentMultiplier})
                </span>
            </div>
             {!isMaxLevel && (
                <>
                    <div>
                        <span className="font-semibold text-gray-700">다음 레벨:</span>
                        <span className="font-bold text-xl text-yellow-500 ml-2">
                            {[...Array(currentMultiplier + 1)].map((_, i) => '⭐').join('')} (통행료 X{currentMultiplier + 1})
                        </span>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-700">업그레이드 비용:</span>
                        <span className="font-bold text-xl text-red-600 ml-2">₩{upgradeCost.toLocaleString()}</span>
                    </div>
                </>
             )}
              <div>
                <span className="font-semibold text-gray-700">내 자산:</span>
                <span className="font-bold text-xl text-green-700 ml-2">₩{player.money.toLocaleString()}</span>
            </div>
             {isMaxLevel && (
                <p className="text-center font-bold text-green-600 pt-2">최고 레벨에 도달했습니다!</p>
             )}
        </div>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={onUpgrade}
            disabled={!canAfford || isMaxLevel}
            className="flex-1 bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            성장시키기
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-gray-500 transition shadow-md"
          >
            다음에
          </button>
        </div>
        {!canAfford && !isMaxLevel && <p className="text-red-500 mt-4">업그레이드 자금이 부족합니다.</p>}
      </div>
    </div>
  );
};

export default UpgradeCityModal;