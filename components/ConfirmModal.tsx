import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border-4 border-gray-300 transform transition-all animate-jump-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 my-4">{message}</p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-600 transition shadow-md"
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg text-lg hover:bg-gray-300 transition shadow-md"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
