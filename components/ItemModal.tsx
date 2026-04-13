import React from 'react';
import { Item } from '../types';

const ItemModal: React.FC<{ item: Item; onClose: () => void; }> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-teal-50 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-teal-300 transform transition-all animate-jump-in">
        <h2 className="text-4xl font-black text-teal-800 mb-4 drop-shadow-lg">🏺 아이템 획득!</h2>
        
        <div className="flex flex-col items-center my-6">
            <div className="text-7xl mb-3">{item.icon}</div>
            <p className="text-3xl font-bold text-gray-800">{item.name}{item.isAdvanced && ' (고급)'}</p>
        </div>

        <div className="text-lg text-gray-700 my-6 bg-white/70 p-4 rounded-lg border-2 border-teal-200">
          <p>{item.description}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-teal-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-teal-600 transition shadow-md"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default ItemModal;
