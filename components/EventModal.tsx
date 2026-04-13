
import React from 'react';

interface EventModalProps {
  description: string;
  goldChange?: number;
  onClose: () => void;
  isFetching: boolean;
}

const GoldChangeEffect: React.FC<{goldChange: number}> = ({ goldChange }) => {
    const isPositive = goldChange > 0;
    return (
        <div
            key={Date.now()}
            className={`absolute -top-5 left-1/2 -translate-x-1/2 text-4xl font-black opacity-0 animate-gold-effect ${isPositive ? 'text-green-500' : 'text-red-500'}`}
            style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}
        >
            {isPositive ? '+' : ''}{goldChange.toLocaleString()} G
        </div>
    );
}

const EventModal: React.FC<EventModalProps> = ({ description, goldChange, onClose, isFetching }) => {
  const hasGoldChange = goldChange !== undefined && goldChange !== 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-50 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-yellow-300 transform transition-all animate-jump-in">
        <h2 className="text-3xl font-bold text-yellow-800 mb-4">역사 카드!</h2>
        {isFetching ? (
            <div className="min-h-[10rem] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-600 mb-4"></div>
                <p className="text-lg text-yellow-700">어떤 사건이 일어날까요?</p>
            </div>
        ) : (
            <>
                <div className="relative mb-4">
                    {hasGoldChange && <GoldChangeEffect goldChange={goldChange} />}
                </div>
                <p className="text-lg text-yellow-700 min-h-[6rem] flex items-center justify-center text-center mb-6 bg-white/80 p-4 rounded-lg">
                {description}
                </p>
                <button
                onClick={onClose}
                className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-orange-600 transition shadow-md"
                >
                확인
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default EventModal;