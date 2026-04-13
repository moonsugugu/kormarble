import React, { useEffect, useState } from 'react';
import { GameState, Action, TollPaymentInfo, GameStage, Player, Item } from '../types';
import { DYNASTY_NAMES, SOUNDS } from '../constants';
import GameBoard from './GameBoard';
import PlayerInfoPanel from './PlayerInfoPanel';
import CityModal from './CityModal';
import EventModal from './EventModal';
import OpponentCityModal from './OpponentCityModal';
import StealMoneyModal from './StealMoneyModal';
import GameOverModal from './GameOverModal';
import TravelModal from './TravelModal';
import UpgradeCityModal from './UpgradeCityModal';
import StealPropertyModal from './StealPropertyModal';
import { generateWorksheetContent } from '../services/geminiService';

interface GameScreenProps {
  gameState: GameState;
  dispatch: React.Dispatch<Action>;
  onTurnEnd: () => void;
  onRestart: () => void;
  onContinueTurn: () => void;
  onResetTurn: () => void;
  playSound: (soundUrl: string, volume?: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  apiKey?: string;
}

const Toast: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800/80 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-jump-in">
        {message}
    </div>
);

const TollPaymentAnimation: React.FC<{ info: TollPaymentInfo }> = ({ info }) => {
  const { fromPlayer, toPlayer, amount } = info;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-toll-payment bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-amber-400 flex items-center gap-4">
        <div className="flex flex-col items-center text-center w-20">
          <div className={`w-12 h-12 rounded-full ${fromPlayer.color} border-2 border-white shadow-md mb-1`}></div>
          <span className="font-bold text-gray-700 truncate">{fromPlayer.name}</span>
        </div>
        <div className="flex flex-col items-center">
           <span className="text-2xl font-bold text-red-500">- ₩{amount.toLocaleString()}</span>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </div>
        <div className="flex flex-col items-center text-center w-20">
            <div className={`w-12 h-12 rounded-full ${toPlayer.color} border-2 border-white shadow-md mb-1`}></div>
            <span className="font-bold text-gray-700 truncate">{toPlayer.name}</span>
        </div>
      </div>
    </div>
  );
};

const SalaryPaymentAnimation: React.FC<{ info: { player: Player, amount: number } }> = ({ info }) => {
  const { player, amount } = info;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-toll-payment bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-green-400 flex flex-col items-center gap-2">
        <div className="flex flex-col items-center text-center w-20">
          <div className={`w-12 h-12 rounded-full ${player.color} border-2 border-white shadow-md mb-1`}></div>
          <span className="font-bold text-gray-700 truncate">{player.name}</span>
        </div>
        <span className="text-3xl font-bold text-green-600">+ ₩{amount.toLocaleString()}</span>
        <span className="text-lg font-semibold text-gray-600">월급을 받았습니다!</span>
      </div>
    </div>
  );
};

const ItemModal: React.FC<{ item: Item; onClose: () => void; }> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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


const GameScreen: React.FC<GameScreenProps> = ({ gameState, dispatch, onTurnEnd, onRestart, onContinueTurn, onResetTurn, playSound, isMuted, toggleMute, apiKey }) => {
  const { players, currentPlayerIndex, board, diceValues, isRolling, error, tollPaymentInfo, salaryPaymentInfo, isMoving, toastMessage, treasury } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const currentSpace = board[currentPlayer.position];
  const rolledDoubles = diceValues[0] === diceValues[1] && diceValues[0] > 0;
  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState(false);

  useEffect(() => {
    if (tollPaymentInfo) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_TOLL_EFFECT' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [tollPaymentInfo, dispatch]);
  
  useEffect(() => {
    if (salaryPaymentInfo) {
        const timer = setTimeout(() => dispatch({ type: 'CLEAR_SALARY_EFFECT' }), 3000);
        return () => clearTimeout(timer);
    }
  }, [salaryPaymentInfo, dispatch]);
  
  const handleActionAndEndTurn = () => {
    if (gameState.turnShouldEnd) {
        onTurnEnd();
        return;
    }
    if (rolledDoubles && !gameState.justEscapedIsland) {
        onContinueTurn();
    } else {
        onTurnEnd();
    }
  };
  
  const handleModalCloseAndEndTurn = () => {
     dispatch({ type: 'CLOSE_MODALS' });
     handleActionAndEndTurn();
  };
  
  const handleBuyCity = () => {
    playSound(SOUNDS.BUY_CITY);
    dispatch({ type: 'BUY_CITY', payload: { playerIndex: currentPlayerIndex } });
    handleActionAndEndTurn();
  };

  const handleDeclineBuy = () => {
    dispatch({ type: 'CLOSE_MODALS' });
    handleActionAndEndTurn();
  }
  
  const handleBuyOpponentCity = () => {
    playSound(SOUNDS.BUY_CITY);
    dispatch({ type: 'BUY_OPPONENT_CITY', payload: { playerIndex: currentPlayerIndex, spaceIndex: currentPlayer.position } });
    handleActionAndEndTurn();
  };

  const handleDeclineBuyOpponentCity = () => {
    dispatch({ type: 'CLOSE_MODALS' });
    handleActionAndEndTurn();
  };

  const handleUpgradeCity = () => {
    playSound(SOUNDS.BUY_CITY);
    dispatch({ type: 'UPGRADE_CITY' });
    handleActionAndEndTurn();
  };
  
  const handleDeclineUpgrade = () => {
    dispatch({ type: 'CLOSE_MODALS' });
    handleActionAndEndTurn();
  };

  const handleRoll = () => {
     if (!currentPlayer.isAI) {
        playSound(SOUNDS.DICE_ROLL);
        dispatch({ type: 'SET_IS_ROLLING', payload: true });
        setTimeout(() => {
            const d1 = Math.floor(Math.random()*6)+1, d2 = Math.floor(Math.random()*6)+1;
            if (currentPlayer.turnsOnIsland > 0) {
                if (d1 === d2 || currentPlayer.turnsOnIsland === 1) {
                    dispatch({ type: 'ESCAPE_ISLAND', payload: { diceValues: [d1, d2] } });
                } else {
                    dispatch({ type: 'STAY_ON_ISLAND', payload: { diceValues: [d1, d2] } });
                }
            } else {
                dispatch({ type: 'ROLL_DICE', payload: { diceValues: [d1, d2] } });
            }
        }, 1000);
    }
  }
  
  const handleDownloadWorksheet = async () => {
    if (isGeneratingWorksheet || !gameState.dynasty) return;
    setIsGeneratingWorksheet(true);
    dispatch({ type: 'SHOW_TOAST', payload: 'AI가 학습지를 만들고 있어요... 🧠' });

    try {
        const dynastyName = DYNASTY_NAMES[gameState.dynasty];
        const worksheetText = await generateWorksheetContent(dynastyName, gameState.board, apiKey);
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>한국사마블 학습지 (${dynastyName})</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; padding: 25px; max-width: 800px; margin: 0 auto; }
                    h1 { text-align: center; color: #4A5568; }
                    h3 { color: #2C5282; border-bottom: 2px solid #63B3ED; padding-bottom: 5px; margin-top: 30px; }
                    p { margin: 10px 0; }
                    .question { margin-bottom: 12px; }
                    .answer { color: #C53030; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>🎲 한국사마블 학습지: ${dynastyName} 시대 🎲</h1>
                <div>
                    ${worksheetText
                        .replace(/### (.*)/g, '<h3>$1</h3>')
                        .replace(/(\d+\..*?)\s*\((정답:.*?)\)/g, '<p class="question">$1 <span class="answer">$2</span></p>')
                        .replace(/\n/g, '')
                    }
                </div>
                <hr style="margin-top: 30px;">
                <p style="text-align: center; color: #718096; font-size: 12px;">만든 날짜: ${new Date().toLocaleDateString()}</p>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `한국사마블_${dynastyName}_학습지.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
        setIsGeneratingWorksheet(false);
    }
  };

  const isDiceDisabled = isRolling || isMoving || currentPlayer.isAI || (diceValues[0] > 0 && !rolledDoubles) || gameState.stage === GameStage.GameOver;
  const dynastyName = gameState.dynasty ? DYNASTY_NAMES[gameState.dynasty] : '';

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {toastMessage && <Toast message={toastMessage} />}
      <GameBoard 
        board={board} 
        players={players} 
        dynasty={gameState.dynasty}
        dynastyName={dynastyName} 
        specialSpaces={gameState.specialSpaces}
        treasury={treasury}
        gameState={gameState}
        onRoll={handleRoll}
        onRestart={onRestart}
        isDiceDisabled={isDiceDisabled}
        isMuted={isMuted}
        toggleMute={toggleMute}
      />
      <div className="lg:w-1/3 flex flex-col gap-6 z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-3 text-center border-2 border-amber-200 flex flex-col sm:flex-row gap-3">
            <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(dynastyName + ' 역사')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600 transition shadow-md flex items-center justify-center gap-2 text-sm"
                title="새 탭에서 해당 시대 관련 영상을 검색합니다."
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L12,19C9.81,19 8.2,18.84 7.17,18.56C6.27,18.31 5.69,17.73 5.44,16.83C5.31,16.36 5.22,15.73 5.16,14.93C5.09,14.13 5.06,13.44 5.06,12.84L5,12C5,9.81 5.16,8.2 5.44,7.17C5.69,6.27 6.27,5.69 7.17,5.44C7.64,5.31 8.27,5.22 9.07,5.16C9.87,5.09 10.56,5.06 11.16,5.06L12,5C14.19,5 15.8,5.16 16.83,5.44C17.73,5.69 18.31,6.27 18.56,7.17Z" /></svg>
                시대 영상 보기
            </a>
            <button
                onClick={handleDownloadWorksheet}
                disabled={isGeneratingWorksheet}
                className="flex-1 bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition shadow-md flex items-center justify-center gap-2 disabled:bg-gray-400 text-sm"
                title="현재 보드판 내용으로 학습지 자료(선생님용)를 만듭니다."
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {isGeneratingWorksheet ? 'AI 생성 중...' : '학습지 자료 (선생님용)'}
            </button>
        </div>
        <PlayerInfoPanel players={players} currentPlayerIndex={currentPlayerIndex} board={board} specialSpaces={gameState.specialSpaces} />
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center border-2 border-amber-200">
           <h2 className="text-2xl font-bold text-amber-800 mb-4">{currentPlayer.name}의 차례</h2>
            {currentPlayer.turnsOnIsland > 0 && <div className="mb-4 text-lg font-bold text-blue-800 bg-blue-100 p-3 rounded-lg">무인도에 있습니다! (남은 턴: {currentPlayer.turnsOnIsland})<br/><span className="text-sm font-normal">더블이 나오면 탈출합니다.</span></div>}
            {rolledDoubles && !gameState.justEscapedIsland && <div className="mb-4 text-lg font-bold text-orange-800 bg-orange-100 p-3 rounded-lg">더블! 한 번 더 던지세요.</div>}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4 text-left" role="alert">
                  <strong className="font-bold">에러 발생!</strong>
                  <p className="text-sm my-1">{error}</p>
                  <button
                      onClick={onResetTurn}
                      className="w-full bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 transition-all mt-2"
                  >
                      현재 턴 다시 시작
                  </button>
              </div>
            )}
        </div>
      </div>
      
      {tollPaymentInfo && <TollPaymentAnimation info={tollPaymentInfo} />}
      {salaryPaymentInfo && <SalaryPaymentAnimation info={{ player: players[salaryPaymentInfo.playerIndex], amount: salaryPaymentInfo.amount }} />}

      {gameState.showCityModal && currentSpace?.type === 'city' && currentSpace.owner === undefined && (
         <CityModal 
            city={currentSpace} 
            player={currentPlayer} 
            onBuy={handleBuyCity} 
            onClose={handleDeclineBuy} 
            specialSpaces={gameState.specialSpaces}
            spaceIndex={currentPlayer.position}
        />
      )}
      {gameState.showOpponentCityModal && currentSpace?.type === 'city' && currentSpace.owner !== undefined && (
        <OpponentCityModal
          space={currentSpace}
          buyer={currentPlayer}
          owner={players[currentSpace.owner]}
          onBuy={handleBuyOpponentCity}
          onClose={handleDeclineBuyOpponentCity}
        />
      )}
      {gameState.showEventModal && (
        <EventModal 
          description={gameState.eventDescription} 
          goldChange={gameState.lastGoldChange} 
          onClose={handleModalCloseAndEndTurn}
          isFetching={gameState.isFetchingEvent}
        />
      )}
      {gameState.showStealMoneyModal && gameState.eventForSteal && (
        <StealMoneyModal
          event={gameState.eventForSteal}
          stealer={currentPlayer}
          victims={players.filter(p => p.id !== currentPlayer.id)}
          onSteal={(victimId, amount) => dispatch({ type: 'STEAL_MONEY', payload: { fromPlayerId: victimId, amount }})}
          onClose={handleActionAndEndTurn}
        />
      )}
      {gameState.showStealPropertyModal && gameState.eventForSteal && (
        <StealPropertyModal
            event={gameState.eventForSteal}
            stealer={currentPlayer}
            victims={players.filter(p => p.id !== currentPlayer.id && board.some(s => s.owner === p.id))}
            onSteal={(victimId) => dispatch({ type: 'STEAL_PROPERTY', payload: { victimId }})}
            onClose={handleActionAndEndTurn}
        />
      )}
      {gameState.showTravelModal && (
        <TravelModal 
            board={board} 
            players={players}
            onSelectDestination={(idx) => dispatch({ type: 'TRAVEL_TO_SPACE', payload: { destinationIndex: idx } })} 
            currentPosition={currentPlayer.position}
            specialSpaces={gameState.specialSpaces}
        />
      )}
      {gameState.showUpgradeModal && currentSpace?.type === 'city' && (
        <UpgradeCityModal 
            city={currentSpace}
            player={currentPlayer}
            onUpgrade={handleUpgradeCity}
            onClose={handleDeclineUpgrade}
        />
      )}
      {gameState.showItemModal && gameState.acquiredItem && (
          <ItemModal item={gameState.acquiredItem} onClose={handleModalCloseAndEndTurn} />
      )}
      {gameState.stage === GameStage.GameOver && gameState.winner && (
        <GameOverModal winner={gameState.winner} reason={gameState.winningReason!} onRestart={() => dispatch({ type: 'RESET_GAME' })} />
      )}
    </div>
  );
};

export default GameScreen;