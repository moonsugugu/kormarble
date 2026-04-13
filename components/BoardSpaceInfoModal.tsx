import React from 'react';
import { BoardSpace } from '../types';

interface BoardSpaceInfoModalProps {
  space: BoardSpace;
  onClose: () => void;
}

const formatDescription = (description: string) => {
    if (!description) return null;
    const parts = description.split('**');
    return (
        <p className="text-left text-base">
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


const BoardSpaceInfoModal: React.FC<BoardSpaceInfoModalProps> = ({ space, onClose }) => {
  const icon = space.name.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u)?.[0].trim() || space.icon || null;
  const textName = space.name.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();

  return (
    <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4"
        onClick={onClose}
    >
      <div 
        className="bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-md w-full text-center border-4 border-amber-300 transform transition-all animate-jump-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-amber-800 mb-4 flex items-center justify-center gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            {textName}
        </h2>
        
        {space.description && (
          <div className="text-sm text-gray-700 my-4 bg-amber-100/70 p-4 rounded-lg border border-amber-200 max-h-64 overflow-y-auto">
            {formatDescription(space.description)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardSpaceInfoModal;