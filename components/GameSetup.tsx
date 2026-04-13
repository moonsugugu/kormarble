
import React, { useState, useEffect } from 'react';
import { GameSetupOptions } from '../types';

interface GameSetupProps {
  onStartGame: (setup: GameSetupOptions) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [totalPlayers, setTotalPlayers] = useState(2);
  const [humanPlayers, setHumanPlayers] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>(['']);
  
  // totalPlayers가 바뀔 때 humanPlayers가 유효한 범위에 있도록 조정
  useEffect(() => {
    if (humanPlayers > totalPlayers) {
      setHumanPlayers(totalPlayers);
    }
  }, [totalPlayers, humanPlayers]);

  useEffect(() => {
    setPlayerNames(currentNames => {
        const newNames = Array(humanPlayers).fill('');
        for (let i = 0; i < Math.min(currentNames.length, humanPlayers); i++) {
            newNames[i] = currentNames[i];
        }
        return newNames;
    });
  }, [humanPlayers]);

  const handleNameChange = (index: number, name: string) => {
    setPlayerNames(currentNames => {
        const newNames = [...currentNames];
        newNames[index] = name;
        return newNames;
    });
  };

  const aiPlayers = totalPlayers - humanPlayers;

  const handleStart = () => {
    if (totalPlayers >= 2 && totalPlayers <= 4 && humanPlayers > 0) {
      const finalPlayerNames = playerNames.map((name, index) => name.trim() || `플레이어 ${index + 1}`);
      onStartGame({ humanPlayers, aiPlayers, playerNames: finalPlayerNames });
    }
  };
  
  const NumberButton: React.FC<{value: number, label?: string, selected: boolean, onClick: () => void, disabled?: boolean}> = 
  ({ value, label, selected, onClick, disabled }) => (
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-12 rounded-lg text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-orange-500 hover:bg-orange-100'}`}
      >{label || value}</button>
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-lg mx-auto text-center border-4 border-amber-300">
      <h1 className="text-5xl font-bold text-amber-800 mb-2">한국사마블</h1>
      <p className="text-amber-600 mb-8 text-lg">귀여운 역사 영웅들과 함께 떠나는 신나는 모험!</p>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">총 플레이어</h2>
          <div className="flex justify-center space-x-3">
             {[2, 3, 4].map(num => (
                 <NumberButton key={num} value={num} label={`${num}명`} selected={totalPlayers === num} onClick={() => setTotalPlayers(num)} />
             ))}
          </div>
        </div>

        <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">사람 플레이어</h3>
            <div className="flex justify-center space-x-3">
                {[...Array(totalPlayers)].map((_, i) => {
                    const num = i + 1;
                    return (
                        <NumberButton 
                            key={num} 
                            value={num} 
                            label={`${num}명`} 
                            selected={humanPlayers === num} 
                            onClick={() => setHumanPlayers(num)}
                        />
                    )
                })}
            </div>
        </div>
        
        {humanPlayers > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">플레이어 이름 입력</h3>
            <div className="space-y-2">
              {playerNames.map((name, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={10}
                  placeholder={`플레이어 ${index + 1} 이름`}
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white/70"
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-gray-600 text-lg bg-amber-100/50 p-3 rounded-lg">
            <p>사람: {humanPlayers}명 / AI: {aiPlayers}명</p>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="mt-10 w-full bg-red-500 text-white font-bold py-4 px-6 rounded-xl text-2xl hover:bg-red-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
      >
        게임 시작!
      </button>
    </div>
  );
};

export default GameSetup;
