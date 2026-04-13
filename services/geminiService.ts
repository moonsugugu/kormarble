

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { HistoricalEvent, Dynasty, BoardSpace } from '../types';
import { DYNASTY_NAMES } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const eventSchema = {
    type: Type.OBJECT,
    properties: {
        eventType: {
            type: Type.STRING,
            enum: [
                'GOLD_CHANGE', 
                'STEAL_MONEY', 
                'GOTO_ISLAND',
                'GOTO_TREASURY',
                'GOTO_START',
                'GOTO_TRAVEL',
                'GOTO_NEAREST_ITEM'
            ],
            description: "이벤트의 종류. GOTO_ISLAND, GOTO_TREASURY 같은 이동 이벤트는 20% 확률로 발생시켜줘. 나머지는 비슷한 확률로 발생합니다.",
        },
        description: {
            type: Type.STRING,
            description: "플레이어에게 일어나는 사건에 대한 50자 내외의 짧고 귀여운 설명. (예: 화랑도의 도움으로 금화를 발견했습니다!)"
        },
        goldChange: {
            type: Type.INTEGER,
            description: "eventType이 'GOLD_CHANGE'일 때, 플레이어가 얻거나 잃는 골드 (-150 ~ 150). 다른 eventType의 경우 0입니다."
        },
        stealAmount: {
            type: Type.INTEGER,
            description: "eventType이 'STEAL_MONEY'일 경우, 다른 플레이어에게서 빼앗을 금액입니다 (25, 50, 100 중 하나). 다른 eventType의 경우 0으로 설정합니다."
        }
    },
    required: ["eventType", "description", "goldChange", "stealAmount"],
};

export const generateHistoricalEvent = async (dynasty: Dynasty): Promise<HistoricalEvent> => {
    const dynastyName = DYNASTY_NAMES[dynasty];
    try {
        const apiCall = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `한국 '${dynastyName}' 시대 배경의 귀여운 보드게임 역사 사건 카드 1개를 JSON으로 생성해줘. 스키마 설명을 따르고, 다양하고 창의적인 사건을 만들어줘.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: eventSchema,
            },
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('API Timeout')), 10000)
        );
        
        const response = await Promise.race([apiCall, timeoutPromise]);

        const jsonText = response.text.trim();
        const eventData = JSON.parse(jsonText);
        
        const validEventTypes = ['GOLD_CHANGE', 'STEAL_MONEY', 'GOTO_ISLAND', 'GOTO_TREASURY', 'GOTO_START', 'GOTO_TRAVEL', 'GOTO_NEAREST_ITEM'];

        if (typeof eventData.description === 'string' && 
            typeof eventData.eventType === 'string' &&
            validEventTypes.includes(eventData.eventType)
        ) {
            if (eventData.eventType !== 'GOLD_CHANGE') {
                eventData.goldChange = 0;
            }
            if (eventData.eventType !== 'STEAL_MONEY') {
                eventData.stealAmount = undefined;
            } else {
                if (![25, 50, 100].includes(eventData.stealAmount)) {
                    eventData.stealAmount = [25, 50, 100][Math.floor(Math.random() * 3)];
                }
            }
            
            return eventData as HistoricalEvent;
        } else {
            console.error("Invalid data structure from Gemini API:", eventData);
            throw new Error("Gemini API returned data in an unexpected format.");
        }

    } catch (error) {
        console.error("Error generating historical event:", error);
        const fallbacks: HistoricalEvent[] = [
            {
                description: "시간의 균열을 발견했습니다! 50골드를 획득합니다.",
                eventType: 'GOLD_CHANGE',
                goldChange: 50,
            },
            {
                description: "알 수 없는 힘에 이끌려 출발점으로 돌아갑니다!",
                eventType: 'GOTO_START',
            },
            {
                description: "길에서 오래된 보물 지도를 주웠습니다! 100골드를 획득합니다.",
                eventType: 'GOLD_CHANGE',
                goldChange: 100,
            },
            {
                description: "역사의 소용돌이에 휘말려 무인도로 가게 됩니다!",
                eventType: 'GOTO_ISLAND',
            }
        ];
        const randomIndex = Math.floor(Math.random() * fallbacks.length);
        return fallbacks[randomIndex];
    }
};

export const generateWorksheetContent = async (dynastyName: string, board: BoardSpace[]): Promise<string> => {
    const content = board
        .filter(space => space.type === 'city' && space.description)
        .map(space => `- ${space.name}: ${space.description?.replace(/\*\*/g, '')}`)
        .join('\n');

    const prompt = `
        You are a fun and friendly history teacher for young students.
        Based on the following historical facts from the Korean history board game, '${dynastyName}', create a quiz worksheet.

        The worksheet should be structured exactly like this:
        1. A main title: ### 🎲 ${dynastyName} OX 퀴즈 🎲
        2. 15 O/X (true/false) questions, each numbered like "1. Question...".
        3. After each O/X question, provide the answer on the same line in the format: (정답: O) or (정답: X)
        4. A second main title: ### ✏️ ${dynastyName} 빈칸 채우기 ✏️
        5. 15 fill-in-the-blank questions, each numbered. For the blank, use '___'.
        6. After each fill-in-the-blank question, provide the answer on the same line in the format: (정답: word)

        All questions MUST be based ONLY on the provided content. Use a cute and encouraging tone.

        ---
        [Historical Content]
        ${content}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating worksheet:", error);
        throw new Error("학습지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
};
