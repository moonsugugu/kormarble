import React, { useState } from 'react';
import { Dynasty, BoardSpace } from '../types';
import { DYNASTY_NAMES, DYNASTY_CITY_POOLS, TEMPLATE_BOARD_STRUCTURE } from '../constants';
import HelpModal from './HelpModal';

interface DynastySelectionProps {
  onSelectDynasty: (dynasty: Dynasty, board: BoardSpace[]) => void;
  apiKey: string;
  onOpenApiKeyModal: () => void;
}

const DYNASTY_DESCRIPTIONS: Record<Dynasty, string> = {
    GOJOSEON_THREE_KINGDOMS: '단군 신화부터 고구려, 백제, 신라의 치열한 경쟁까지, 한반도 고대사의 여명을 체험하세요.',
    UNIFIED_SILLA_BALHAE: '남쪽의 통일신라와 북쪽의 발해가 공존했던 남북국 시대의 찬란한 문화를 만나보세요.',
    LATER_THREE_KINGDOMS: '신라 말, 견훤과 궁예, 왕건이 다시 천하를 놓고 다투던 혼란과 격동의 시대로 떠나보세요.',
    GORYEO: '화려한 귀족 문화와 역동적인 국제 교류, 그리고 외세의 침략에 맞서 싸운 고려의 500년 역사를 경험하세요.',
    JOSEON: '성리학적 이상 국가를 꿈꾸었던 조선 왕조의 건국부터 융성, 그리고 근대의 격랑까지 함께하세요.',
    MODERN_CONTEMPORARY: '일제강점기의 시련부터 민주화와 산업화, 그리고 세계를 선도하는 오늘날까지 격동의 시대를 경험하세요.',
};

const DYNASTY_ICONS: Record<Dynasty, string> = {
    GOJOSEON_THREE_KINGDOMS: '🏹',
    UNIFIED_SILLA_BALHAE: '🛕',
    LATER_THREE_KINGDOMS: '⚔️',
    GORYEO: '🏺',
    JOSEON: '🏛️',
    MODERN_CONTEMPORARY: '🇰🇷',
};

const NUM_CITY_SPACES = TEMPLATE_BOARD_STRUCTURE.filter(s => s.type === 'city').length;

const generateRandomBoard = (dynasty: Dynasty): BoardSpace[] => {
    const cityPool = DYNASTY_CITY_POOLS[dynasty];
    const citySlots = TEMPLATE_BOARD_STRUCTURE.map((space, index) => ({ space, index })).filter(item => item.space.type === 'city');

    const newBoard = [...TEMPLATE_BOARD_STRUCTURE];

    if (!cityPool || cityPool.length < citySlots.length) {
        // Not enough unique cities, fill with placeholders
        citySlots.forEach(({ index }) => {
            newBoard[index] = { ...newBoard[index], name: '미개척지', description: '아직 역사가 기록되지 않은 땅입니다.', category: '장소', icon: '🏞️' };
        });
        return newBoard;
    }
    
    const shuffledCities = [...cityPool].sort(() => 0.5 - Math.random());
    
    citySlots.forEach(({ index, space }, i) => {
        const newCityData = shuffledCities[i];
        newBoard[index] = {
            ...newCityData,
            price: space.price, // Keep original price progression
        };
    });

    return newBoard;
};


const DynastySelection: React.FC<DynastySelectionProps> = ({ onSelectDynasty, apiKey, onOpenApiKeyModal }) => {
  const dynasties: Dynasty[] = Object.keys(DYNASTY_NAMES) as Dynasty[];
  const [showHelp, setShowHelp] = useState(false);
  
  const [generatedBoards, setGeneratedBoards] = useState<Record<Dynasty, BoardSpace[]>>(() => {
    return dynasties.reduce((acc, dynasty) => {
        acc[dynasty] = generateRandomBoard(dynasty);
        return acc;
    }, {} as Record<Dynasty, BoardSpace[]>);
  });

  const handleBoardRegenerate = (dynasty: Dynasty, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratedBoards(prev => ({
      ...prev,
      [dynasty]: generateRandomBoard(dynasty)
    }));
  };
  
  const getBoardPreview = (board: BoardSpace[]): string => {
      if (!board || board.length < 2) return "역사 여행";
      return board.filter(s => s.type === 'city' && s.price && s.price > 300).slice(0, 3).map(s => s.name.replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim()).join(', ');
  }

  return (
    <>
      <div className="bg-gradient-to-br from-white/90 to-amber-100/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-5xl mx-auto text-center border-4 border-amber-300 relative">
        <div className="absolute top-6 right-6 z-20 flex gap-2">
            <button 
                onClick={onOpenApiKeyModal} 
                className={`font-bold py-2 px-5 rounded-lg transition shadow-md text-lg flex items-center gap-2 ${apiKey ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                aria-label="API 키 설정"
            >
                {apiKey ? '✅ API 키 설정됨' : '🔑 API 키 입력'}
            </button>
            <button 
                onClick={() => setShowHelp(true)} 
                className="bg-sky-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-600 transition shadow-md text-lg"
                aria-label="게임 방법 보기"
            >
                ? 게임 방법
            </button>
        </div>
        <h1 className="text-6xl font-black text-amber-900 drop-shadow-md">한국사마블</h1>
        <p className="text-amber-700 text-sm mb-2">made by 뭉슈쌤</p>
        <h2 className="text-4xl font-bold text-amber-800 mb-4">📜 시대를 선택하세요 🗺️</h2>
        <p className="text-amber-600 mb-10 text-lg">역사의 주사위는 당신의 손에! 어떤 시대를 호령하시겠습니까?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dynasties.map((dynasty) => {
            const currentBoard = generatedBoards[dynasty];
            const previewText = getBoardPreview(currentBoard);
            const canRegenerate = DYNASTY_CITY_POOLS[dynasty]?.length >= NUM_CITY_SPACES;

            return (
                <div
                key={dynasty}
                onClick={() => onSelectDynasty(dynasty, currentBoard)}
                className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-400 transition-all transform hover:scale-105 shadow-lg text-left flex flex-col h-full cursor-pointer"
                >
                    <h3 className="text-2xl font-bold text-amber-800 flex items-center gap-3">
                        <span className="text-3xl">{DYNASTY_ICONS[dynasty]}</span>
                        <span>{DYNASTY_NAMES[dynasty]}</span>
                    </h3>
                    <p className="text-gray-600 mt-2 text-sm flex-grow">{DYNASTY_DESCRIPTIONS[dynasty]}</p>
                    
                    <div className="mt-3 pt-3 border-t border-amber-200/80">
                        <p className="text-xs text-gray-500 font-bold">주요 내용: <span className="font-normal text-gray-600 truncate">{previewText}</span></p>
                    </div>

                    <button
                        onClick={(e) => handleBoardRegenerate(dynasty, e)}
                        disabled={!canRegenerate}
                        className="w-full mt-3 bg-white text-amber-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-amber-200/50 border border-amber-300 transition shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={canRegenerate ? "새로운 인물/유물로 보드를 교체합니다." : "이 시대는 아직 준비 중입니다."}
                    >
                        보드 교체
                    </button>
                </div>
            )
          })}
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
};

export default DynastySelection;