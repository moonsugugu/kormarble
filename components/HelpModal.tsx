
import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-2xl w-full border-4 border-amber-300 transform transition-all animate-jump-in flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-amber-800 text-center mb-3">📜 한국사마블 게임 방법</h2>
        
        <div className="flex-grow overflow-y-auto pr-2 text-gray-700 space-y-2 text-left">
            <div>
                <h3 className="font-bold text-lg text-amber-700 mb-1">🎯 게임 목표</h3>
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                    <li>주사위를 굴려 보드를 이동하며 대한민국의 역사를 체험하고, 가장 뛰어난 전략가가 되어 천하를 통일하세요!</li>
                    <li>다른 플레이어들을 모두 파산시키거나, 한 라인(모서리 제외 9칸)의 모든 도시를 독점하면 승리합니다.</li>
                    <li><strong>(시간제한 규칙)</strong> 설정된 시간이 다 되었을 때, 현금과 부동산을 합친 총자산이 가장 많은 플레이어가 승리합니다.</li>
                </ul>
            </div>
            <div>
                <h3 className="font-bold text-lg text-amber-700 mb-1">🎲 게임 진행</h3>
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                    <li><strong>주사위 굴리기</strong>: 자기 차례가 되면 주사위를 굴려 나온 눈의 합만큼 이동합니다. 더블이 나오면 한 번 더 굴릴 수 있습니다.</li>
                    <li><strong>월급</strong>: 출발지를 지나거나 도착하면 월급으로 200골드를 받습니다.</li>
                    <li><strong>도시 구매</strong>: 주인이 없는 도시에 도착하면 표시된 가격에 구매할 수 있습니다. 구매하지 않으면 다음 플레이어에게 차례가 넘어갑니다.</li>
                    <li><strong>통행료 지불</strong>: 다른 플레이어의 도시에 도착하면 통행료를 지불해야 합니다. 통행료는 기본적으로 땅값의 50%입니다.</li>
                    <li><strong>상대 도시 인수</strong>: 통행료를 낸 후, 원한다면 해당 도시를 땅값의 2배 가격에 강제로 인수할 수 있습니다.</li>
                    <li><strong>내 도시 성장 (랜드마크)</strong>: 자신이 소유한 도시에 다시 도착하면, 땅값의 50%를 지불하여 도시를 성장시킬 수 있습니다. 성장은 최대 2번 가능하며(⭐, ⭐⭐), 성장할 때마다 통행료가 1배씩 증가합니다 (최대 3배).</li>
                </ul>
            </div>
            <div>
                <h3 className="font-bold text-lg text-amber-700 mb-1">🗺️ 특수 칸</h3>
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                    <li><strong>출발</strong>: 한 바퀴 돌아 지나갈 때마다 월급 200골드를 받습니다. 정확히 도착하면 보너스를 추가로 받습니다.</li>
                    <li><strong>무인도</strong>: 도착하면 3턴 동안 갇힙니다. 주사위 더블이 나오거나, 3턴이 지나면 탈출합니다.</li>
                    <li><strong>순간이동</strong>: 도착하면 원하는 칸으로 즉시 이동할 수 있습니다. 이동 중 출발지를 지나면 월급을 받습니다.</li>
                    <li><strong>국고 징수</strong>: 도착하면 국고에 세금을 내야 합니다. 초기 세금은 80골드이며, 누군가 낼 때마다 금액이 50%씩 증가합니다.</li>
                    <li><strong>역사 카드</strong>: 도착하면 해당 시대와 관련된 다양한 역사적 사건이 발생합니다. 행운이 따를 수도, 위기가 닥칠 수도 있습니다!</li>
                    <li><strong>아이템</strong>: 도착하면 게임에 도움이 되는 특별한 효과를 가진 아이템을 얻습니다. 아이템은 최대 5개까지 보유할 수 있습니다.</li>
                    <li><strong>통행료 배수 지역 (X2, X3)</strong>: 보드판의 특정 도시들은 통행료가 2배 또는 3배로 적용됩니다! 인수 전쟁이 가장 치열한 곳이니 주의하세요.</li>
                </ul>
            </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-orange-600 transition shadow-md"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default HelpModal;
