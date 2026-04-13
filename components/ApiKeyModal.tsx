
import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave, currentApiKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey);

  const handleSave = () => {
    onSave(apiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-4 border-blue-300 transform transition-all animate-jump-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-blue-800 text-center mb-4">🔑 Google API 키 설정</h2>
        
        <div className="space-y-4 text-gray-700">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
            <h3 className="font-bold text-blue-700 mb-2">💡 API 키 받는 방법</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">Google AI Studio</a>에 접속합니다.</li>
              <li>'Create API key' 버튼을 클릭하여 키를 생성합니다.</li>
              <li>생성된 키를 복사하여 아래 입력창에 붙여넣으세요.</li>
              <li>이 키는 브라우저에만 저장되며 외부로 유출되지 않습니다.</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Google Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIZA..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition shadow-md"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
