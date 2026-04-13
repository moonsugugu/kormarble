
import React, { useState } from 'react';
import { Player, BoardSpace, Item } from '../types';
import { PLAYER_EMOJIS } from '../constants';

interface PlayerInfoPanelProps {
  players: Player[];
  currentPlayerIndex: number;
  board: BoardSpace[];
  specialSpaces: {
      x2: number[];
      x3: number[];
  };
}

const formatCardName = (name: string) => {
    const textName = name.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();

    if (textName.includes(' ')) {
        const parts = textName.split(' ');
        return {
            formattedName: <>{parts[0]}<br />{parts.slice(1).join(' ')}</>,
            nameClass: "font-semibold text-gray-800 leading-tight text-[10px] md:text-[11px]",
        };
    }
    
    const len = textName.length;
    if (len <= 3) {
        return {
            formattedName: textName,
            nameClass: "font-semibold text-gray-800 text-[11px] md:text-xs",
        };
    }
    if (len === 4) {
        return {
            formattedName: <>{textName.substring(0, 2)}<br />{textName.substring(2, 4)}</>,
            nameClass: "font-semibold text-gray-800 leading-tight text-[11px] md:text-xs",
        };
    }
    if (len >= 5) {
        const breakPoint = len === 5 ? 3 : Math.ceil(len / 2);
        return {
            formattedName: <>{textName.substring(0, breakPoint)}<br />{textName.substring(breakPoint)}</>,
            nameClass: "font-semibold text-gray-800 leading-tight text-[10px] md:text-[11px]",
        };
    }
    return {
        formattedName: textName,
        nameClass: "font-semibold text-gray-800 leading-tight text-[11px] md:text-xs",
    };
};

const PropertyCard: React.FC<{ space: BoardSpace; spaceIndex: number; specialSpaces: PlayerInfoPanelProps['specialSpaces'] }> = ({ space, spaceIndex, specialSpaces }) => {
    const landmarkMultiplier = space.multiplier || 1;
    let toll = space.price ? Math.floor(space.price * 0.5 * landmarkMultiplier) : 0;
    
    let specialStyle = 'border-gray-200';
    let multiplierText = null;

    if (specialSpaces.x3.includes(spaceIndex)) {
        toll *= 3;
        specialStyle = 'border-yellow-400 border-2 ring-2 ring-yellow-400';
        multiplierText = <span className="text-purple-600 font-black"> (X3!)</span>;
    } else if (specialSpaces.x2.includes(spaceIndex)) {
        toll *= 2;
        specialStyle = 'border-red-400 border-2';
        multiplierText = <span className="text-red-600 font-black"> (X2!)</span>;
    }
    
    const { formattedName, nameClass } = formatCardName(space.name);

    return (
        <div className={`bg-white rounded-lg p-2 shadow-sm border flex flex-col items-center justify-center text-center h-full ${specialStyle}`}>
            <div className="flex items-center justify-center h-8">
                {landmarkMultiplier > 1 && (
                     <span className="text-yellow-500 font-bold text-xs mr-1">
                        ⭐{landmarkMultiplier - 1}
                     </span>
                )}
                <p className={nameClass}>{formattedName}</p>
            </div>
            {toll > 0 && (
               <p className="text-[10px] md:text-[11px] text-gray-700 font-bold mt-1">
                   통행료: ₩{toll.toLocaleString()}
                   {multiplierText}
                </p>
            )}
        </div>
    );
};


const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ players, currentPlayerIndex, board, specialSpaces }) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  const toggleExpand = (playerId: number) => {
    setExpandedPlayerId(currentId => (currentId === playerId ? null : playerId));
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-3 border-2 border-amber-200">
      <h2 className="text-2xl font-bold text-center text-amber-800 mb-2">플레이어 정보</h2>
      {players.map((player, index) => {
        const ownedProperties = board
            .map((space, index) => ({ space, index }))
            .filter(({ space }) => space.type === 'city' && space.owner === player.id);
        
        const propertyValue = ownedProperties.reduce((sum, { space }) => sum + (space.price || 0), 0);
        const totalAssets = player.money + propertyValue;

        const isExpanded = expandedPlayerId === player.id;

        return (
            <div
              key={player.id}
              className={`rounded-lg transition-all duration-300 ${
                index === currentPlayerIndex ? 'bg-amber-200 scale-105 shadow-md' : 'bg-gray-100'
              }`}
            >
              <div
                className={`w-full p-3 text-left`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${player.color}`} />
                    <span className="font-bold text-base md:text-lg text-gray-800">{PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length]} {player.name} {player.isAI && '(AI)'}</span>
                  </div>
                  <div className="text-right">
                      <p className="font-semibold text-xs md:text-sm text-green-700">현금: ₩{player.money.toLocaleString()}</p>
                      <p className="font-semibold text-[10px] md:text-xs text-gray-600">총자산: ₩{totalAssets.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2 items-center">
                        {player.items.map((item, itemIndex) => (
                            // FIX: Complete truncated component and add default export to fix module resolution.
                            <div key={itemIndex} className="relative group">
                                <span className="text-lg cursor-help">{item.icon}</span>
                                <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 left-1/2 -translate-x-1/2">
                                    <p className="font-bold">{item.name}{item.isAdvanced && ' (고급)'}</p>
                                    <p className="text-gray-200">{item.description}</p>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(ownedProperties.length > 0 || player.items.length > 0) && (
                         <button onClick={() => toggleExpand(player.id)} className="text-xs text-amber-700 hover:text-amber-900 font-semibold">
                            {isExpanded ? '▲ 접기' : '▼ 펼치기'}
                         </button>
                    )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-3 pt-0">
                  {ownedProperties.length > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ownedProperties.map(({ space, index }) => (
                            <PropertyCard key={index} space={space} spaceIndex={index} specialSpaces={specialSpaces} />
                        ))}
                     </div>
                  )}
                </div>
              )}
            </div>
        );
      })}
    </div>
  );
};

export default PlayerInfoPanel;
