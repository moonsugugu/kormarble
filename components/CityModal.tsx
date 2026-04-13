


import React, { useState, useEffect } from 'react';
import { BoardSpace, Player } from '../types';

interface CityModalProps {
  city: BoardSpace;
  player: Player;
  onBuy: () => void;
  onClose: () => void;
  specialSpaces: {
      x2: number[];
      x3: number[];
  };
  spaceIndex: number;
}

const formatDescription = (description: string) => {
    if (!description) return null;
    const parts = description.split('**');
    return (
        <p className="text-left">
            📜{' '}
            {parts.map((part, index) =>
                index % 2 === 1 ? (
                    <strong key={index} className="text-orange-600 font-bold">
                        {part}
                    </strong>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </p>
    );
};

const CityModal: React.FC<CityModalProps> = ({ city, player, onBuy, onClose, specialSpaces, spaceIndex }) => {
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [countdown, setCountdown] = useState(4);
  
  const basePrice = city.price || 0;
  let discountPercent = 0;
  if (player.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_20')) {
      discountPercent = 0.2;
  } else if (player.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_10')) {
      discountPercent = 0.1;
  }
  const price = Math.floor(basePrice * (1 - discountPercent));
  const canAfford = player.money >= price;
  
  const isX2 = specialSpaces.x2.includes(spaceIndex);
  const isX3 = specialSpaces.x3.includes(spaceIndex);
  const baseToll = city.price ? Math.floor(city.price * 0.5) : 0;
  let finalToll = baseToll;
  let multiplierText: React.ReactNode = null;
  let specialMessage: React.ReactNode = null;

  if (isX3) {
      finalToll *= 3;
      multiplierText = <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-500"> X3!</span>;
      specialMessage = <p className="text-sm font-bold mt-1 text-orange-600">이곳은 특별 지역! 기본 통행료의 3배를 받을 수 있어요!</p>;
  } else if (isX2) {
      finalToll *= 2;
      multiplierText = <span className="font-black text-red-500"> X2!</span>;
      specialMessage = <p className="text-sm font-bold mt-1 text-red-600">이곳은 특별 지역! 기본 통행료의 2배를 받을 수 있어요!</p>;
  }


  useEffect(() => {
    if (!canAfford) {
      setButtonsEnabled(true);
      setCountdown(0);
      return; // No timer needed
    }

    setButtonsEnabled(false);
    setCountdown(4);

    const timer = setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(timer);
          setButtonsEnabled(true);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [city, canAfford]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border-4 border-amber-300 transform transition-all animate-jump-in">
        <h2 className="text-3xl font-bold text-amber-800 mb-2">{city.name} 도착!</h2>
        
        {city.description && (
          <div className="text-sm text-gray-700 my-4 bg-amber-100/70 p-3 rounded-lg border border-amber-200 h-32 overflow-y-auto">
            {formatDescription(city.description)}
          </div>
        )}

        <p className="text-lg text-amber-600 mb-4">이 도시 또는 영웅을 구매하시겠습니까?</p>
        <div className="bg-white/80 rounded-lg p-4 mb-6">
            <p className="text-2xl font-bold text-green-700">가격: ₩{price.toLocaleString()}</p>
            {discountPercent > 0 && (
                <p className="text-sm font-bold text-blue-600">
                    (아이템! <s>₩{basePrice.toLocaleString()}</s> {discountPercent * 100}% 할인)
                </p>
            )}
            {finalToll > 0 && (
              <p className="text-md text-red-600 font-semibold mt-1">
                  <span className="text-gray-700">예상 통행료: </span>₩{finalToll.toLocaleString()}
                  {multiplierText}
              </p>
            )}
            {specialMessage}
            <p className="text-md text-gray-600 mt-2">내 자산: ₩{player.money.toLocaleString()}</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onBuy}
            disabled={!canAfford || !buttonsEnabled}
            className="flex-1 bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            구매하기
          </button>
          <button
            onClick={onClose}
            disabled={!buttonsEnabled}
            className="flex-1 bg-red-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-600 transition shadow-md"
          >
            지나가기
          </button>
        </div>
        {!buttonsEnabled && (
            <p className="text-gray-600 mt-4 text-sm animate-pulse">
                자세히 읽어보세요! {countdown}초 후 버튼이 활성화됩니다.
            </p>
        )}
        {buttonsEnabled && !canAfford && <p className="text-red-500 mt-4">이 도시를 구매하기 위한 자금이 부족합니다.</p>}
      </div>
    </div>
  );
};

export default CityModal;
