
import React, { useState, useEffect } from 'react';

interface DiceProps {
  diceValues: [number, number];
  lastDiceValues: [number, number];
  isRolling: boolean;
  onRoll: () => void;
  disabled: boolean;
}

const DieFace: React.FC<{ value: number }> = ({ value }) => {
  const patterns: { [key: number]: number[] } = {
    1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
    3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
    5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
    6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
  };

  const currentPattern = patterns[value] || patterns[1];

  return (
    <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center p-2 border-2 border-gray-200">
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full">
        {currentPattern.map((dot, index) => (
          <div key={index} className="flex items-center justify-center">
            {dot ? <div className="w-4 h-4 bg-gray-800 rounded-full"></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};


const Dice: React.FC<DiceProps> = ({ diceValues, lastDiceValues, isRolling, onRoll, disabled }) => {
  const [displayValues, setDisplayValues] = useState<[number, number]>(lastDiceValues);
  const total = diceValues[0] + diceValues[1];

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 80);
      return () => clearInterval(interval);
    } else {
      setDisplayValues(diceValues[0] > 0 ? diceValues : lastDiceValues);
    }
  }, [isRolling, diceValues, lastDiceValues]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4">
        <DieFace value={displayValues[0]} />
        <DieFace value={displayValues[1]} />
      </div>
      
      {total > 0 && !isRolling && (
        <div className="text-xl font-bold text-amber-900 mt-2">
          총 <span className="text-3xl text-red-600 font-black">{total}</span>칸 이동!
        </div>
      )}

      <button
        onClick={onRoll}
        disabled={disabled}
        className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg text-xl hover:bg-orange-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 shadow-md mt-2"
      >
        {isRolling ? '...' : '주사위 굴리기'}
      </button>
    </div>
  );
};

export default Dice;
