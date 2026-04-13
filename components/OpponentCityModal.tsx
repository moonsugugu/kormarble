

import React from 'react';
import { BoardSpace, Player } from '../types';

interface OpponentCityModalProps {
  space: BoardSpace;
  buyer: Player;
  owner: Player;
  onBuy: () => void;
  onClose: () => void;
}

const OpponentCityModal: React.FC<OpponentCityModalProps> = ({ space, buyer, owner, onBuy, onClose }) => {
  const purchasePrice = (space.price || 0) * 2;
  const canAfford = buyer.money >= purchasePrice;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border-4 border-amber-300 transform transition-all animate-jump-in">
        <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full ${owner.color} border-2 border-white shadow-md`}></div>
            <h2 className="text-3xl font-bold text-amber-800">{owner.name}의 땅: {space.name}</h2>
        </div>
        
        <p className="text-lg text-amber-600 mb-4">통행료를 지불했습니다. 이 땅을 2배 가격에 구매할까요?</p>

        <div className="bg-white/80 rounded-lg p-4 mb-6">
            <p className="text-2xl font-bold text-red-700">구매 가격: ₩{purchasePrice.toLocaleString()}</p>
            <p className="text-md text-gray-600 mt-2">내 자산: ₩{buyer.money.toLocaleString()}</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onBuy}
            disabled={!canAfford}
            className="flex-1 bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            구매하기
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-gray-500 transition shadow-md"
          >
            지나가기
          </button>
        </div>
        {!canAfford && <p className="text-red-500 mt-4">이 땅을 구매하기 위한 자금이 부족합니다.</p>}
      </div>
    </div>
  );
};

export default OpponentCityModal;