
export enum GameStage {
    DynastySelection,
    VictoryConditionSelection,
    Setup,
    Playing,
    GameOver,
}

export type Dynasty = 'GOJOSEON_THREE_KINGDOMS' | 'UNIFIED_SILLA_BALHAE' | 'LATER_THREE_KINGDOMS' | 'GORYEO' | 'JOSEON' | 'MODERN_CONTEMPORARY';

export type ItemEffect =
    | 'TOLL_INCREASE_10'
    | 'TREASURY_EXEMPTION'
    | 'SALARY_BONUS_10'
    | 'TOLL_DISCOUNT_10'
    | 'ISLAND_STAY_REDUCED_1'
    | 'LAND_PURCHASE_DISCOUNT_10'
    // Advanced Effects
    | 'TOLL_INCREASE_20'
    | 'SALARY_BONUS_20'
    | 'TOLL_DISCOUNT_20'
    | 'LAND_PURCHASE_DISCOUNT_20';

export interface Item {
    name: string;
    description: string;
    effect: ItemEffect;
    icon: string;
    dynasty: Dynasty[];
    isAdvanced?: boolean;
}

export interface Player {
    id: number;
    name: string;
    money: number;
    position: number;
    isAI: boolean;
    color: string;
    turnsOnIsland: number;
    items: Item[];
    emoji: string;
}

export type BoardSpaceType = 'start' | 'city' | 'event' | 'corner' | 'item' | 'travel' | 'treasury';
export type BoardSpaceCategory = '인물' | '장소' | '유물' | '제도' | '전투' | '문화' | '사건';

export interface BoardSpace {
    name:string;
    type: BoardSpaceType;
    price?: number;
    owner?: number;
    description?: string;
    category?: BoardSpaceCategory;
    icon?: string;
    multiplier?: 1 | 2 | 3;
}

export interface TollPaymentInfo {
    fromPlayer: Player;
    toPlayer: Player;
    amount: number;
}

export interface VictoryCondition {
    type: 'DEFAULT' | 'TIME';
    duration?: 5 | 10 | 15; // in minutes
}

export type HistoricalEventType = 
    | 'GOLD_CHANGE' 
    | 'STEAL_MONEY' 
    | 'GOTO_ISLAND'
    | 'GOTO_TREASURY'
    | 'GOTO_START'
    | 'GOTO_TRAVEL'
    | 'GOTO_NEAREST_ITEM';

export interface HistoricalEvent {
    description: string;
    eventType: HistoricalEventType;
    goldChange?: number; // For GOLD_CHANGE
    stealAmount?: 25 | 50 | 100; // For STEAL_MONEY
}

// Fix: Add missing EraEvent type definition for EraEventModal component.
export type EraEventEffect = 'TOLL_DISCOUNT_20' | 'CONSTRUCTION_COST_UP_50' | 'CHANCE_BECOMES_TRAVEL';

export interface EraEvent {
    description: string;
    effect: EraEventEffect;
    duration: number;
}

export interface GameState {
    stage: GameStage;
    dynasty: Dynasty | null;
    players: Player[];
    currentPlayerIndex: number;
    board: BoardSpace[];
    diceValues: [number, number];
    lastDiceValues: [number, number];
    isRolling: boolean;
    isMoving: boolean;
    stepsToMove: number;
    showCityModal: boolean;
    showEventModal: boolean;
    isFetchingEvent: boolean;
    eventDescription: string;
    lastGoldChange?: number;
    error: string | null;
    tollPaymentInfo: TollPaymentInfo | null;
    salaryPaymentInfo: { playerIndex: number; amount: number } | null;
    justEscapedIsland: boolean;
    victoryCondition: VictoryCondition | null;
    gameStartTime: number | null;
    winner: Player | null;
    winningReason: string | null;
    showOpponentCityModal: boolean;
    showStealMoneyModal: boolean;
    showStealPropertyModal: boolean;
    eventForSteal: HistoricalEvent | null;
    specialSpaces: {
        x2: number[];
        x3: number[];
    };
    toastMessage: string | null;
    turnShouldEnd: boolean;
    shouldProcessTurnAfterEvent?: boolean;
    showTravelModal: boolean;
    showUpgradeModal: boolean;
    justTraveled: boolean;
    justStayedOnIsland?: boolean;
    treasury: number;
    treasuryTaxAmount: number;
    treasuryVisitCount: number;
    turnCount: number;
    showItemModal: boolean;
    acquiredItem: Item | null;
}

export type Action =
    | { type: 'SELECT_DYNASTY'; payload: { dynasty: Dynasty; board: BoardSpace[] } }
    | { type: 'SELECT_VICTORY_CONDITION'; payload: VictoryCondition }
    | { type: 'START_GAME'; payload: Player[] }
    | { type: 'ROLL_DICE'; payload: { diceValues: [number, number] } }
    | { type: 'MOVE_ONE_STEP' }
    | { type: 'FINISH_MOVE' }
    | { type: 'BUY_CITY'; payload: { playerIndex: number } }
    | { type: 'PAY_TOLL'; payload: { fromPlayerIndex: number; toPlayerIndex: number; spaceIndex: number } }
    | { type: 'FETCH_EVENT_START' }
    | { type: 'APPLY_EVENT'; payload: HistoricalEvent }
    | { type: 'END_TURN' }
    | { type: 'CONTINUE_TURN' }
    | { type: 'STAY_ON_ISLAND'; payload: { diceValues: [number, number] } }
    | { type: 'ESCAPE_ISLAND'; payload: { diceValues: [number, number] } }
    | { type: 'SET_IS_ROLLING', payload: boolean }
    | { type: 'TRIGGER_CITY_ACTION' }
    // FIX: Corrected typo in action type definition.
    | { type: 'TRIGGER_OPPONENT_CITY_ACTION' }
    | { type: 'CLOSE_MODALS' }
    | { type: 'SET_ERROR', payload: string | null }
    | { type: 'CLEAR_TOLL_EFFECT' }
    | { type: 'CLEAR_SALARY_EFFECT' }
    | { type: 'RESET_GAME' }
    | { type: 'RESET_CURRENT_TURN' }
    | { type: 'BUY_OPPONENT_CITY'; payload: { playerIndex: number; spaceIndex: number } }
    | { type: 'TRIGGER_STEAL_MONEY'; payload: HistoricalEvent }
    | { type: 'STEAL_MONEY'; payload: { fromPlayerId: number, amount: number } }
    | { type: 'SET_WINNER'; payload: { winner: Player; reason: string } }
    | { type: 'UPDATE_PLAYERS'; payload: Player[] }
    | { type: 'SHOW_TOAST'; payload: string }
    | { type: 'CLEAR_TOAST' }
    | { type: 'SHOW_TRAVEL_MODAL' }
    | { type: 'TRAVEL_TO_SPACE'; payload: { destinationIndex: number } }
    | { type: 'CLEAR_JUST_TRAVELED_FLAG' }
    | { type: 'CLEAR_SHOULD_PROCESS_TURN_FLAG' }
    | { type: 'SHOW_UPGRADE_MODAL' }
    | { type: 'UPGRADE_CITY' }
    | { type: 'PROCESS_TREASURY_LANDING' }
    | { type: 'ACQUIRE_ITEM'; payload: { item: Item } }
    | { type: 'TRIGGER_STEAL_PROPERTY'; payload: HistoricalEvent }
    | { type: 'STEAL_PROPERTY'; payload: { victimId: number } };


export interface GameSetupOptions {
    humanPlayers: number;
    aiPlayers: number;
    playerNames: string[];
}
