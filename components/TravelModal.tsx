
import React from 'react';
import { BoardSpace, Player } from '../types';

interface TravelModalProps {
  board: BoardSpace[];
  currentPosition: number;
  onSelectDestination: (index: number) => void;
  players: Player[];
  specialSpaces: {
    x2: number[];
    x3: number[];
  };
}

const formatNameForTravel = (name: string) => {
    const textName = name.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();
    if (textName.includes(' ')) {
        const parts = textName.split(' ');
        return {
            formattedName: <>{parts[0]}<br />{parts.slice(1).join(' ')}</>,
            textSize: 'text-[7px] md:text-[8px] leading-[1.1]',
        };
    }
    const len = textName.length;
    if (len <= 4) {
        return { formattedName: textName, textSize: 'text-[8px] md:text-[9px]' };
    }
    if (len >= 5) {
         const breakPoint = len === 5 ? 3 : Math.ceil(len / 2);
         return {
            formattedName: <>{textName.substring(0, breakPoint)}<br />{textName.substring(breakPoint)}</>,
            textSize: 'text-[7px] md:text-[8px] leading-[1.1]',
        };
    }
    return { formattedName: textName, textSize: 'text-[8px] md:text-[9px]' };
};

const TravelModal: React.FC<TravelModalProps> = ({ board, currentPosition, onSelectDestination, players, specialSpaces }) => {
    const boardPositions = Array.from({ length: 40 }, (_, index) => {
        if (index >= 0 && index <= 10) return { row: 11, col: 11 - index };
        if (index >= 11 && index <= 19) return { row: 11 - (index - 10), col: 1 };
        if (index >= 20 && index <= 30) return { row: 1, col: 1 + (index - 20) };
        if (index >= 31 && index <= 39) return { row: 1 + (index - 30), col: 11 };
        return { row: 0, col: 0 };
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-sky-50 rounded-2xl shadow-2xl p-6 max-w-2xl w-full text-center border-4 border-sky-300 transform transition-all animate-jump-in">
                <h2 className="text-4xl font-bold text-sky-800 mb-4">🚀 순간이동!</h2>
                <p className="text-lg text-sky-700 mb-6">이동하고 싶은 곳을 선택하세요!</p>
                <div className="aspect-square p-2 bg-sky-200/50 rounded-lg">
                    <div className="grid grid-cols-11 grid-rows-11 gap-1 h-full">
                        {board.map((space, index) => {
                            const pos = boardPositions[index];
                            if (!pos || pos.row === 0 || pos.col === 0) return null;

                            const isCurrent = index === currentPosition;
                            
                            let buttonClass = 'bg-white text-gray-700 hover:bg-yellow-200 border border-sky-200';
                            
                            if (space.type === 'city' && space.owner !== undefined) {
                                const ownerColor = players[space.owner]?.color;
                                if (ownerColor) {
                                    buttonClass = `${ownerColor} text-white`;
                                }
                            }

                            if (isCurrent) {
                                buttonClass = 'bg-gray-500 text-white';
                            }
                            
                            const isX2 = specialSpaces.x2.includes(index);
                            const isX3 = specialSpaces.x3.includes(index);
                            const isLandmark = space.type === 'city' && space.multiplier && space.multiplier > 1;
                            const { formattedName, textSize } = formatNameForTravel(space.name);

                            return (
                                <button
                                    key={index}
                                    onClick={() => onSelectDestination(index)}
                                    disabled={isCurrent}
                                    style={{ gridRow: pos.row, gridColumn: pos.col }}
                                    className={`rounded-sm flex items-center justify-center p-0.5 font-bold transition-transform transform hover:scale-110 hover:z-10 disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass} ${textSize}`}
                                    title={space.name}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <span className="leading-tight">{formattedName}</span>
                                        <div className="flex items-center text-[10px] space-x-0.5" style={{ textShadow: '0 0 3px black' }}>
                                            {isLandmark && <span title={`랜드마크 (통행료 x${space.multiplier})`}>⭐</span>}
                                            {isX3 && <span className="font-black text-yellow-300" title="통행료 3배!">X3</span>}
                                            {isX2 && !isX3 && <span className="font-bold text-red-400" title="통행료 2배!">X2</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        <div className="col-start-2 row-start-2 col-span-9 row-span-9 bg-white/50 rounded-lg flex items-center justify-center">
                            <span className="text-sky-600 font-bold text-2xl">목적지 선택</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelModal;