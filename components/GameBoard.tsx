

import React, { useState, useEffect } from 'react';
import { BoardSpace, Player, BoardSpaceCategory, Dynasty, GameState, GameStage } from '../types';
import { DYNASTY_BOARD_CENTER_IMAGES } from '../constants';
import Dice from './Dice';

interface GameBoardProps {
  board: BoardSpace[];
  players: Player[];
  dynasty: Dynasty | null;
  dynastyName: string;
  specialSpaces: {
      x2: number[];
      x3: number[];
  };
  treasury: number;
  gameState: GameState;
  onRoll: () => void;
  onRestart: () => void;
  isDiceDisabled: boolean;
  isMuted: boolean;
  toggleMute: () => void;
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

const Timer: React.FC<{ startTime: number, duration: number }> = ({ startTime, duration }) => {
    const [remaining, setRemaining] = useState(duration * 60);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const newRemaining = (duration * 60) - elapsed;
            setRemaining(Math.max(0, newRemaining));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime, duration]);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return (
        <div className="bg-white/80 p-2 px-4 rounded-full shadow-inner text-gray-800 font-bold text-lg">
            ⏳ {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
        </div>
    );
};


const PlayerPawn: React.FC<{ player: Player }> = ({ player }) => (
    <div title={player.name} className="relative w-5 h-5 flex items-center justify-center text-xl drop-shadow-lg">
        {player.emoji}
    </div>
);

const PawnsOnSpace: React.FC<{ playersOnSpace: Player[] }> = ({ playersOnSpace }) => (
  <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end h-6">
    <div className="flex -space-x-2.5">
        {playersOnSpace.map(player => (
            <PlayerPawn key={player.id} player={player} />
        ))}
    </div>
  </div>
);

const GameBoard: React.FC<GameBoardProps> = ({ board, players, dynasty, dynastyName, specialSpaces, treasury, gameState, onRoll, onRestart, isDiceDisabled, isMuted, toggleMute }) => {

    const sideColors = {
        defaultCity: { bg: 'bg-stone-200', text: 'text-stone-800', border: 'border-stone-400' }, 
        corner: { bg: 'bg-indigo-300', text: 'text-indigo-900', border: 'border-indigo-500' },
        travel: { bg: 'bg-sky-300', text: 'text-sky-900', border: 'border-sky-500' },
        treasury: { bg: 'bg-lime-300', text: 'text-lime-900', border: 'border-lime-500' },
        start: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-700' },
        event: { bg: 'bg-yellow-300', text: 'text-yellow-900', border: 'border-yellow-500' },
        item: { bg: 'bg-teal-300', text: 'text-teal-900', border: 'border-teal-500' },
    };

    const getSpaceStyling = (space: BoardSpace) => {
        if (space.type === 'start') return sideColors.start;
        if (space.type === 'event') return sideColors.event;
        if (space.type === 'item') return sideColors.item;
        if (space.type === 'corner') return sideColors.corner;
        if (space.type === 'travel') return sideColors.travel;
        if (space.type === 'treasury') return sideColors.treasury;

        if (space.type === 'city') {
            if (space.owner !== undefined) {
                const ownerColor = players[space.owner]?.color || 'bg-gray-400';
                return { bg: `${ownerColor} opacity-80`, text: 'text-white', border: 'border-gray-700' };
            }
            return sideColors.defaultCity;
        }
        return { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-400' };
    };
  
    const getOwnerIndicator = (space: BoardSpace) => {
        if (space.type === 'city' && space.owner !== undefined) {
            const owner = players[space.owner];
            if(owner) {
                return (
                    <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5">
                        {space.multiplier && space.multiplier > 1 && (
                            <div className="flex">
                                {[...Array(space.multiplier - 1)].map((_, i) => (
                                    <span key={i} className="text-yellow-400 text-xs" style={{filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.7))'}}>⭐</span>
                                ))}
                            </div>
                        )}
                        <div className={`w-3 h-3 rounded-full border border-white shadow-md ${owner.color}`} title={`${owner.name}의 땅`}></div>
                    </div>
                );
            }
        }
        return null;
    };
    
    const boardPositions = Array.from({ length: 40 }, (_, index) => {
        if (index >= 0 && index <= 10) return { row: 11, col: 11 - index, index };
        if (index >= 11 && index <= 19) return { row: 11 - (index - 10), col: 1, index };
        if (index >= 20 && index <= 30) return { row: 1, col: 1 + (index - 20), index };
        if (index >= 31 && index <= 39) return { row: 1 + (index - 30), col: 11, index };
        return { row: 0, col: 0, index };
    });

    const SpaceComponent: React.FC<{space: BoardSpace, index: number}> = ({space, index}) => {
        const styling = getSpaceStyling(space);
        
        const iconMatch = space.name.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
        const icon = iconMatch ? iconMatch[0].trim() : (space.icon || null);
        const textName = space.name.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();

        const formatName = (name: string) => {
            if (name.includes(' ')) {
                const parts = name.split(' ');
                return {
                    formattedName: <>{parts[0]}<br />{parts.slice(1).join(' ')}</>,
                    textSize: 'text-[8px] md:text-[9px] leading-[1.1]',
                };
            }
            
            const len = name.length;
            if (len <= 3) {
                return { formattedName: name, textSize: 'text-[9px] md:text-[10px]' };
            }
            if (len === 4) {
                return {
                    formattedName: <>{name.substring(0, 2)}<br />{name.substring(2, 4)}</>,
                    textSize: 'text-[9px] md:text-[10px] leading-tight',
                };
            }
            if (len >= 5) {
                 const breakPoint = len === 5 ? 3 : Math.ceil(len / 2);
                 return {
                    formattedName: <>{name.substring(0, breakPoint)}<br />{name.substring(breakPoint)}</>,
                    textSize: 'text-[8px] md:text-[9px] leading-[1.1]',
                };
            }
            return { formattedName: name, textSize: 'text-[9px] md:text-[10px]' };
        };

        const { formattedName, textSize } = formatName(textName);

        const isX2 = specialSpaces.x2.includes(index);
        const isX3 = specialSpaces.x3.includes(index);
        
        const calculateToll = () => {
            if (!space.price) return 0;
            const landmarkMultiplier = space.multiplier || 1;
            let toll = Math.floor(space.price * 0.5 * landmarkMultiplier);
            if (isX3) toll *= 3;
            else if (isX2) toll *= 2;
            return toll;
        }

        const CategoryTag: React.FC<{ category: BoardSpaceCategory }> = ({ category }) => {
            const colors: Record<BoardSpaceCategory, string> = {
                '인물': 'bg-blue-500 text-white',
                '장소': 'bg-green-600 text-white',
                '유물': 'bg-purple-600 text-white',
                '제도': 'bg-orange-500 text-white',
                '전투': 'bg-red-600 text-white',
                '문화': 'bg-pink-500 text-white',
                '사건': 'bg-yellow-400 text-gray-800',
            };
            return (
                <div className={`absolute top-0.5 left-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full z-10 ${colors[category] || 'bg-gray-500 text-white'} shadow-sm`}>
                    {category}
                </div>
            )
        };
        
        const pos = boardPositions.find(p => p.index === index);
        let tooltipPositionClasses = "";
        let arrowPositionClasses = "";

        // Vertical positioning
        if (pos && pos.row < 4) { // Top rows
            tooltipPositionClasses += "top-[105%] ";
            arrowPositionClasses += "bottom-full border-b-8 border-b-amber-300 ";
        } else { // Bottom and side rows
            tooltipPositionClasses += "bottom-[105%] ";
            arrowPositionClasses += "top-full border-t-8 border-t-amber-300 ";
        }

        // Horizontal positioning
        if (pos && pos.col < 3) { // Left columns
            tooltipPositionClasses += "left-0 ";
            arrowPositionClasses += "left-8 ";
        } else if (pos && pos.col > 9) { // Right columns
            tooltipPositionClasses += "right-0 ";
            arrowPositionClasses += "right-8 ";
        } else { // Middle columns
            tooltipPositionClasses += "left-1/2 -translate-x-1/2 ";
            arrowPositionClasses += "left-1/2 -translate-x-1/2 ";
        }


        return (
             <div 
                className={`group relative rounded-md border-2 shadow-md flex flex-col justify-start items-center p-0.5 pt-1 pb-6 text-center h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${styling.bg} ${styling.border}`}
                tabIndex={0}
             >
                {space.description && (
                     <div className={`absolute w-56 max-w-none bg-amber-50 border-2 border-amber-300 rounded-lg shadow-xl p-3 text-xs text-gray-800 opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 z-50 ${tooltipPositionClasses}`}>
                        <h3 className="font-bold text-amber-800 text-sm mb-2 text-center">{textName}</h3>
                        {formatDescription(space.description)}
                        {space.type === 'city' && space.price && (
                            <div className="mt-2 pt-2 border-t border-amber-200 text-left text-xs space-y-0.5">
                                <p className="font-bold text-gray-800">💰 땅값: <span className="font-normal text-gray-700">₩{space.price.toLocaleString()}</span></p>
                                <p className="font-bold text-gray-800">💸 통행료: <span className="font-normal text-gray-700">₩{calculateToll().toLocaleString()}</span></p>
                            </div>
                        )}
                        <div className={`absolute w-0 h-0 border-x-8 border-x-transparent ${arrowPositionClasses}`}></div>
                    </div>
                )}

                {space.category && <CategoryTag category={space.category} />}
                 {isX3 && (
                    <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-black text-xs flex items-center justify-center rounded-full shadow-lg border-2 border-white transform rotate-12 z-20" title="통행료 3배!">
                        X3
                    </div>
                 )}
                 {isX2 && !isX3 && (
                    <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-red-500 text-white font-black text-xs flex items-center justify-center rounded-full shadow-lg border-2 border-white transform rotate-12 z-20" title="통행료 2배!">
                        X2
                    </div>
                )}
                
                <div className="flex flex-col items-center -space-y-0.5">
                    {icon && <span className="text-base leading-none">{icon}</span>}
                    <span className={`font-bold ${styling.text} ${textSize}`}>{formattedName}</span>
                </div>
                
                <div className="w-full flex flex-col items-center mt-auto">
                    {space.price && (
                        <span 
                            className={`text-[9px] leading-tight ${styling.text} font-medium`}
                             style={space.owner !== undefined ? { color: 'white', textShadow: '0 0 3px black, 0 0 3px black' } : {}}
                        >
                            ₩{space.price.toLocaleString()}
                        </span>
                    )}
                     {space.owner !== undefined && space.price && (
                        <span 
                            className="text-[9px] leading-tight font-bold" 
                            style={{ color: 'white', textShadow: '0 0 3px black, 0 0 3px black' }}
                        >
                            (₩{calculateToll().toLocaleString()})
                        </span>
                    )}
                    {space.type === 'treasury' && <span className={`text-[9px] ${styling.text} opacity-90 font-medium`}>₩{treasury.toLocaleString()}</span>}
                </div>

                <PawnsOnSpace playersOnSpace={players.filter(p => p.position === index)} />
                {getOwnerIndicator(space)}
            </div>
        )
    };
    
    const centerImageUrl = dynasty ? DYNASTY_BOARD_CENTER_IMAGES[dynasty] : '';
    const centerStyle = centerImageUrl ? { backgroundImage: `url("${centerImageUrl}")` } : {};

  return (
    <>
    <div className="flex-1 aspect-square max-w-3xl mx-auto">
      <div className="grid grid-cols-11 grid-rows-11 gap-1 h-full">
        {boardPositions.map(({ row, col, index }) => (
            (board[index] && row > 0 && col > 0) ? (
                <div 
                  key={index}
                  style={{
                    gridRow: row,
                    gridColumn: col,
                  }}
                >
                    <SpaceComponent space={board[index]} index={index} />
                </div>
            ) : null
        ))}
        
        {/* Current Player Indicator */}
        {!isDiceDisabled && gameState.stage === GameStage.Playing && (() => {
            const currentPlayer = players[gameState.currentPlayerIndex];
            const pos = boardPositions.find(p => p.index === currentPlayer.position);
            if (!pos) return null;
            
            return (
                <div 
                    style={{ 
                        gridRow: pos.row > 1 ? pos.row - 1 : 1, 
                        gridColumn: pos.col,
                        alignItems: pos.row > 1 ? 'flex-end' : 'flex-start',
                    }}
                    className="flex justify-center pointer-events-none z-30"
                >
                    <span 
                        className={`text-3xl text-red-500 animate-bounce-arrow ${pos.row > 1 ? '' : 'rotate-180 -translate-y-2'}`} 
                        style={{filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'}}
                    >
                        🔻
                    </span>
                </div>
            );
        })()}

        <div 
            className="relative col-start-2 row-start-2 col-span-9 row-span-9 bg-amber-200/50 rounded-2xl flex flex-col items-center justify-center p-4 border-4 border-dashed border-amber-400 bg-cover bg-center overflow-hidden"
            style={centerStyle}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-2 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-amber-900 drop-shadow-md">🎲 한국사마블<br/>({dynastyName})</h2>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            {gameState.victoryCondition?.type === 'TIME' && gameState.gameStartTime && gameState.victoryCondition.duration &&
                <Timer startTime={gameState.gameStartTime} duration={gameState.victoryCondition.duration} />
            }
          </div>
          
          <Dice 
              diceValues={gameState.diceValues}
              lastDiceValues={gameState.lastDiceValues}
              isRolling={gameState.isRolling}
              onRoll={onRoll}
              disabled={isDiceDisabled}
          />
          
          <div className="absolute bottom-4 right-4 flex gap-2 items-center">
              <button onClick={onRestart} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition shadow-md">
                  처음으로 돌아가기
              </button>
              <button onClick={toggleMute} title={isMuted ? "소리 켜기" : "소리 끄기"} className="bg-white/80 p-2 px-3 rounded-lg shadow-md hover:bg-amber-100 transition-transform transform hover:scale-110 text-xl">
                {isMuted ? '🔇' : '🔊'}
              </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

// FIX: Add default export to make it available for default import in GameScreen.tsx.
export default GameBoard;
