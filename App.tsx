






import React, { useState, useReducer, useCallback, useEffect, useRef } from 'react';
// FIX: Imported `HistoricalEvent` type to resolve 'Cannot find name' error.
import { GameStage, Player, GameState, Action, GameSetupOptions, Dynasty, VictoryCondition, BoardSpace, Item, ItemEffect, HistoricalEvent } from './types';
import { INITIAL_GAME_STATE, PLAYER_COLORS, ITEMS, CUTE_AI_NAMES, PLAYER_EMOJIS, SOUNDS } from './constants';
import DynastySelection from './components/DynastySelection';
import VictoryConditionSelection from './components/VictoryConditionSelection';
import GameSetup from './components/GameSetup';
import GameScreen from './components/GameScreen';
import ConfirmModal from './components/ConfirmModal';
import { generateHistoricalEvent } from './services/geminiService';

const soundCache: { [key: string]: HTMLAudioElement } = {};


const chooseTravelDestinationForAI = (state: GameState): number => {
    const { board, players, currentPlayerIndex } = state;
    const currentPlayer = players[currentPlayerIndex];

    // Strategy 1: Find the most expensive unowned city AI can afford
    const unownedCities = board
        .map((space, index) => ({ space, index }))
        .filter(({ space }) => space.type === 'city' && space.owner === undefined && space.price && currentPlayer.money >= space.price);

    if (unownedCities.length > 0) {
        unownedCities.sort((a, b) => b.space.price! - a.space.price!);
        return unownedCities[0].index;
    }

    // Strategy 2: Find own city that can be upgraded and AI can afford
    const upgradeableCities = board
        .map((space, index) => ({ space, index }))
        .filter(({ space }) => {
            const upgradeCost = Math.floor((space.price || 0) / 2);
            return space.type === 'city' &&
                   space.owner === currentPlayer.id &&
                   (space.multiplier || 1) < 3 &&
                   currentPlayer.money >= upgradeCost;
        });
    
    if (upgradeableCities.length > 0) {
        // Prioritize cities with higher price to upgrade
        upgradeableCities.sort((a, b) => b.space.price! - a.space.price!);
        return upgradeableCities[0].index;
    }

    // Strategy 3: Go to an 'Item' square for a potential advantage.
    const itemSpaces = board
        .map((space, index) => ({ space, index }))
        .filter(({ space }) => space.type === 'item');

    if (itemSpaces.length > 0) {
        return itemSpaces[Math.floor(Math.random() * itemSpaces.length)].index;
    }

    // Fallback: Go to the most expensive unowned city, even if unaffordable
    const anyUnowned = board.map((s, i) => ({ s, i })).filter(item => item.s.type === 'city' && item.s.owner === undefined);
    if (anyUnowned.length > 0) {
        anyUnowned.sort((a, b) => b.s.price! - a.s.price!);
        return anyUnowned[0].i;
    }

    // Final fallback: just go after start
    return 1;
};

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'SELECT_DYNASTY':
      return { ...state, stage: GameStage.VictoryConditionSelection, dynasty: action.payload.dynasty, board: action.payload.board };
    case 'SELECT_VICTORY_CONDITION':
      const isTimeCondition = action.payload.type === 'TIME';
      return { ...state, stage: GameStage.Setup, victoryCondition: action.payload, gameStartTime: isTimeCondition ? Date.now() : null };
    case 'START_GAME': {
      const board = state.board;
      
      const sides = [[1, 9], [11, 19], [21, 29], [31, 39]];
      const x2Spaces: number[] = [];
      
      sides.forEach(side => {
          const potentialSpaces = board
              .map((space, index) => ({ space, index }))
              .filter(({ space, index }) => 
                  space.type === 'city' && 
                  index >= side[0] && 
                  index <= side[1]
              );
          if (potentialSpaces.length > 0) {
              const randomIndex = Math.floor(Math.random() * potentialSpaces.length);
              x2Spaces.push(potentialSpaces[randomIndex].index);
          }
      });
      
      const remainingSpaces = board
          .map((space, index) => ({ space, index }))
          .filter(({ space, index }) => space.type === 'city' && !x2Spaces.includes(index));

      let x3Space: number[] = [];
      if (remainingSpaces.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingSpaces.length);
          x3Space.push(remainingSpaces[randomIndex].index);
      }
      
      return { ...state, stage: GameStage.Playing, players: action.payload, board, specialSpaces: { x2: x2Spaces, x3: x3Space } };
    }
    case 'ROLL_DICE': {
      const { diceValues } = action.payload;
      return { ...state, diceValues, lastDiceValues: diceValues, isRolling: false, isMoving: true, stepsToMove: diceValues[0] + diceValues[1], showCityModal: false, showEventModal: false };
    }
    case 'MOVE_ONE_STEP': {
        if (state.stepsToMove <= 0) return state;
        let salaryInfo: GameState['salaryPaymentInfo'] = null;
        const updatedPlayers = state.players.map((player, index) => {
            if (index === state.currentPlayerIndex) {
                const newPosition = (player.position + 1) % state.board.length;
                const passedStart = newPosition < player.position;
                let money = player.money;
                if (passedStart) {
                    let salary = 200;
                    let bonusPercent = 0;
                    if (player.items.some(i => i.effect === 'SALARY_BONUS_20')) bonusPercent = 0.2;
                    else if (player.items.some(i => i.effect === 'SALARY_BONUS_10')) bonusPercent = 0.1;
                    
                    salary = Math.floor(salary * (1 + bonusPercent));
                    salaryInfo = { playerIndex: index, amount: salary };
                    money += salary;
                }
                return { ...player, position: newPosition, money };
            }
            return player;
        });
        return { ...state, players: updatedPlayers, stepsToMove: state.stepsToMove - 1, salaryPaymentInfo: salaryInfo || state.salaryPaymentInfo };
    }
    case 'FINISH_MOVE': {
        const currentPlayer = state.players[state.currentPlayerIndex];
        let updatedPlayers = state.players;
        if (currentPlayer.position === 10) { // Land on island
            updatedPlayers = state.players.map((p, i) => i === state.currentPlayerIndex ? { ...p, turnsOnIsland: 3 } : p);
        }
        return { ...state, players: updatedPlayers, isMoving: false, stepsToMove: 0 };
    }
    case 'BUY_CITY': {
      const { playerIndex } = action.payload;
      const player = state.players[playerIndex];
      const city = state.board[player.position];

      if (city.type !== 'city' || city.owner !== undefined) {
        return state;
      }
      
      const basePrice = city.price!;
      let discountPercent = 0;
      if (player.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_20')) {
          discountPercent = 0.2;
      } else if (player.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_10')) {
          discountPercent = 0.1;
      }
      const price = Math.floor(basePrice * (1 - discountPercent));
      let toastMessage: string | null = null;

      if (player.money >= price) {
        if (discountPercent > 0) {
            toastMessage = `아이템 효과! 도시를 ${discountPercent * 100}% 할인된 ₩${price.toLocaleString()}에 구매합니다!`;
        }
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = { ...player, money: player.money - price };
        const updatedBoard = [...state.board];
        updatedBoard[player.position] = { ...city, owner: playerIndex, multiplier: 1 };
        return { ...state, players: updatedPlayers, board: updatedBoard, toastMessage };
      }
      return state;
    }
    case 'PAY_TOLL': {
        const { fromPlayerIndex, toPlayerIndex, spaceIndex } = action.payload;
        const space = state.board[spaceIndex];
        if (space.type !== 'city' || !space.price || space.owner === undefined || space.owner !== toPlayerIndex) {
            return state;
        }

        const baseToll = Math.floor(space.price * 0.5);
        const landmarkMultiplier = space.multiplier || 1;
        let specialMultiplier = 1;

        if (state.specialSpaces.x3.includes(spaceIndex)) {
            specialMultiplier = 3;
        } else if (state.specialSpaces.x2.includes(spaceIndex)) {
            specialMultiplier = 2;
        }
        
        const amount = baseToll * landmarkMultiplier * specialMultiplier;
        
        let updatedPlayers = [...state.players];
        const fromPlayer = updatedPlayers[fromPlayerIndex];
        const toPlayer = updatedPlayers[toPlayerIndex];
        let finalAmount = amount;
        let toastMessage: string | null = null;
        
        // Discount for fromPlayer
        let discountPercent = 0;
        if (fromPlayer.items.some(i => i.effect === 'TOLL_DISCOUNT_20')) discountPercent = 0.2;
        else if (fromPlayer.items.some(i => i.effect === 'TOLL_DISCOUNT_10')) discountPercent = 0.1;
        finalAmount *= (1 - discountPercent);

        // Increase for toPlayer
        let increasePercent = 0;
        if (toPlayer.items.some(i => i.effect === 'TOLL_INCREASE_20')) increasePercent = 0.2;
        else if (toPlayer.items.some(i => i.effect === 'TOLL_INCREASE_10')) increasePercent = 0.1;
        finalAmount *= (1 + increasePercent);
        
        finalAmount = Math.floor(finalAmount);
        
        let updatedBoard = state.board;

        if (fromPlayer.money < finalAmount) {
            let moneyRaised = 0;
            const ownedProperties = state.board
                .map((s, i) => ({ ...s, index: i }))
                .filter(s => s.type === 'city' && s.owner === fromPlayerIndex)
                .sort((a, b) => (a.price || 0) - (b.price || 0));

            const tempBoard = [...state.board];
            const soldProperties: string[] = [];

            for (const prop of ownedProperties) {
                if (fromPlayer.money + moneyRaised >= finalAmount) break;
                const sellPrice = Math.floor(prop.price! * 0.8);
                moneyRaised += sellPrice;
                tempBoard[prop.index] = { ...tempBoard[prop.index], owner: undefined, multiplier: 1 };
                soldProperties.push(prop.name);
            }

            updatedBoard = tempBoard; // FIX: Update the board with sold properties
            
            if (soldProperties.length > 0) {
              const sellToast = `자금 부족으로 다음 자산을 매각합니다: ${soldProperties.join(', ')}`;
              toastMessage = toastMessage ? `${toastMessage} | ${sellToast}` : sellToast;
            }

            updatedPlayers[fromPlayerIndex] = {...fromPlayer, money: fromPlayer.money + moneyRaised - finalAmount};
            updatedPlayers[toPlayerIndex] = {...toPlayer, money: toPlayer.money + finalAmount};
        } else {
            updatedPlayers[fromPlayerIndex] = {...fromPlayer, money: fromPlayer.money - finalAmount};
            updatedPlayers[toPlayerIndex] = {...toPlayer, money: toPlayer.money + finalAmount};
        }

        return { ...state, players: updatedPlayers, board: updatedBoard, toastMessage, tollPaymentInfo: { fromPlayer: state.players[fromPlayerIndex], toPlayer: state.players[toPlayerIndex], amount: finalAmount } };
    }
    case 'FETCH_EVENT_START':
      return { ...state, isFetchingEvent: true, showEventModal: true, eventDescription: '' };
    case 'APPLY_EVENT': {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const { eventType, description } = action.payload;
      let updatedPlayers = [...state.players];
      let finalDescription = description;
      let lastGoldChangeVal: number | undefined;
      let turnShouldEnd = false;
      let shouldProcessTurnAfterEvent = false;
      let toastMessage: string | null = null;
      
      switch (eventType) {
          case 'GOLD_CHANGE':
              updatedPlayers[state.currentPlayerIndex].money += action.payload.goldChange!;
              lastGoldChangeVal = action.payload.goldChange;
              break;
          case 'STEAL_MONEY':
              if (currentPlayer.isAI) {
                  const victims = state.players.filter(p => p.id !== currentPlayer.id && p.money > 0);
                  if (victims.length > 0) {
                      victims.sort((a, b) => b.money - a.money); // Target richest
                      const victim = victims[0];
                      const victimIndex = updatedPlayers.findIndex(p => p.id === victim.id);
                      if (victimIndex !== -1) {
                          const stolenAmount = Math.min(victim.money, action.payload.stealAmount!);
                          updatedPlayers[state.currentPlayerIndex].money += stolenAmount;
                          updatedPlayers[victimIndex].money -= stolenAmount;
                          finalDescription = `${description} (${victim.name}에게서 ₩${stolenAmount.toLocaleString()} 획득)`;
                      }
                  }
              } else {
                  return {
                      ...state,
                      eventDescription: description,
                      showEventModal: false,
                      showStealMoneyModal: true,
                      eventForSteal: action.payload,
                      isFetchingEvent: false
                  };
              }
              break;
          case 'GOTO_ISLAND':
              const islandIndex = state.board.findIndex(s => s.type === 'corner' && s.name.includes('무인도'));
              if(islandIndex !== -1) {
                  updatedPlayers[state.currentPlayerIndex].position = islandIndex;
                  updatedPlayers[state.currentPlayerIndex].turnsOnIsland = 3;
              }
              turnShouldEnd = true;
              break;
          case 'GOTO_TREASURY':
              const treasuryIndex = state.board.findIndex(s => s.type === 'treasury');
              if(treasuryIndex !== -1) {
                  updatedPlayers[state.currentPlayerIndex].position = treasuryIndex;
              }
              shouldProcessTurnAfterEvent = true;
              break;
          case 'GOTO_START':
              const startIndex = 0;
              updatedPlayers[state.currentPlayerIndex].position = startIndex;
              shouldProcessTurnAfterEvent = true;
              break;
          case 'GOTO_TRAVEL':
              const travelIndex = state.board.findIndex(s => s.type === 'travel');
              if (travelIndex !== -1) {
                  updatedPlayers[state.currentPlayerIndex].position = travelIndex;
              }
              shouldProcessTurnAfterEvent = true;
              break;
          case 'GOTO_NEAREST_ITEM':
              const currentPos = currentPlayer.position;
              const itemSpaces = state.board.map((s, i) => ({ s, i })).filter(item => item.s.type === 'item');
              if (itemSpaces.length > 0) {
                  let closest = -1;
                  let minDistance = Infinity;
                  itemSpaces.forEach(item => {
                      const distance = (item.i - currentPos + state.board.length) % state.board.length;
                      if (distance < minDistance) {
                          minDistance = distance;
                          closest = item.i;
                      }
                  });
                  if (closest !== -1) {
                      updatedPlayers[state.currentPlayerIndex].position = closest;
                  }
              }
              shouldProcessTurnAfterEvent = true;
              break;
      }
  
      return {
          ...state,
          players: updatedPlayers,
          eventDescription: finalDescription,
          lastGoldChange: lastGoldChangeVal,
          showEventModal: true,
          isFetchingEvent: false,
          turnShouldEnd,
          shouldProcessTurnAfterEvent,
          toastMessage,
      };
    }
     case 'STAY_ON_ISLAND': {
      const { diceValues } = action.payload;
      const updatedPlayers = state.players.map((p, i) => {
          if (i === state.currentPlayerIndex) {
            let turnsOnIsland = p.turnsOnIsland - 1;
            if (p.items.some(item => item.effect === 'ISLAND_STAY_REDUCED_1')) {
                turnsOnIsland -= 1;
            }
            return { ...p, turnsOnIsland: Math.max(0, turnsOnIsland) };
          }
          return p;
      });
      return { ...state, players: updatedPlayers, isRolling: false, turnShouldEnd: true, diceValues, lastDiceValues: diceValues, justStayedOnIsland: true };
    }
    case 'ESCAPE_ISLAND': {
      const { diceValues } = action.payload;
      const updatedPlayers = state.players.map((p, i) => i === state.currentPlayerIndex ? { ...p, turnsOnIsland: 0 } : p);
      return { ...state, players: updatedPlayers, diceValues, lastDiceValues: diceValues, isRolling: false, justEscapedIsland: true, isMoving: true, stepsToMove: diceValues[0] + diceValues[1] };
    }
    case 'END_TURN': {
      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const turnCount = state.turnCount + 1;
      return { ...state, currentPlayerIndex: nextPlayerIndex, diceValues: [0, 0], showCityModal: false, showEventModal: false, justEscapedIsland: false, eventDescription: '', lastGoldChange: undefined, turnShouldEnd: false, justStayedOnIsland: false, turnCount };
    }
     case 'CONTINUE_TURN': {
      return { ...state, diceValues: [0, 0], justEscapedIsland: false, showCityModal: false, showEventModal: false };
    }
    case 'BUY_OPPONENT_CITY': {
        const { playerIndex, spaceIndex } = action.payload;
        const buyer = state.players[playerIndex];
        const space = state.board[spaceIndex];
        const seller = state.players[space.owner!];
        const price = space.price! * 2;

        if (buyer.money >= price) {
            const updatedPlayers = [...state.players];
            updatedPlayers[playerIndex] = { ...buyer, money: buyer.money - price };
            updatedPlayers[space.owner!] = { ...seller, money: seller.money + price };
            
            const updatedBoard = [...state.board];
            updatedBoard[spaceIndex] = { ...space, owner: playerIndex, multiplier: 1 };
            
            return { ...state, players: updatedPlayers, board: updatedBoard, showOpponentCityModal: false };
        }
        return state;
    }
    case 'TRIGGER_STEAL_MONEY':
        return { ...state, showStealMoneyModal: true, eventForSteal: action.payload };
    case 'STEAL_MONEY': {
        const { fromPlayerId, amount } = action.payload;
        const fromPlayerIndex = state.players.findIndex(p => p.id === fromPlayerId);
        if (fromPlayerIndex === -1) return state;

        const updatedPlayers = [...state.players];
        const stealer = updatedPlayers[state.currentPlayerIndex];
        const victim = updatedPlayers[fromPlayerIndex];

        const stolenAmount = Math.min(victim.money, amount);
        updatedPlayers[state.currentPlayerIndex] = { ...stealer, money: stealer.money + stolenAmount };
        updatedPlayers[fromPlayerIndex] = { ...victim, money: victim.money - stolenAmount };
        
        return { ...state, players: updatedPlayers, showStealMoneyModal: false, eventForSteal: null };
    }
     case 'TRIGGER_STEAL_PROPERTY':
        return { ...state, showStealPropertyModal: true, eventForSteal: action.payload };
     case 'STEAL_PROPERTY': {
        const { victimId } = action.payload;
        const victimIndex = state.players.findIndex(p => p.id === victimId);
        if (victimIndex === -1) return state;

        const victimProperties = state.board
            .map((s, i) => ({...s, index: i}))
            .filter(s => s.type === 'city' && s.owner === victimIndex);
        
        if (victimProperties.length > 0) {
            victimProperties.sort((a, b) => (a.price || 0) - (b.price || 0));
            const cheapestProperty = victimProperties[0];
            const updatedBoard = [...state.board];
            updatedBoard[cheapestProperty.index] = { ...cheapestProperty, owner: state.currentPlayerIndex, multiplier: 1 };
            return { ...state, board: updatedBoard, showStealPropertyModal: false, eventForSteal: null };
        }
        return { ...state, showStealPropertyModal: false, eventForSteal: null };
    }
    case 'SET_WINNER':
        return { ...state, stage: GameStage.GameOver, winner: action.payload.winner, winningReason: action.payload.reason };
    case 'SET_IS_ROLLING':
      return { ...state, isRolling: action.payload };
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };
    case 'TRIGGER_CITY_ACTION':
      return {...state, showCityModal: true };
    // FIX: Corrected typo to match action type definition.
    case 'TRIGGER_OPPONENT_CITY_ACTION':
      return {...state, showOpponentCityModal: true};
    case 'CLOSE_MODALS':
      return {...state, showCityModal: false, showEventModal: false, showOpponentCityModal: false, showStealMoneyModal: false, showStealPropertyModal: false, eventForSteal: null, eventDescription: '', isFetchingEvent: false, showTravelModal: false, showUpgradeModal: false, showItemModal: false, acquiredItem: null };
    case 'SET_ERROR':
        return {...state, error: action.payload, isRolling: false, isFetchingEvent: false };
    case 'CLEAR_TOLL_EFFECT':
        return { ...state, tollPaymentInfo: null };
    case 'CLEAR_SALARY_EFFECT':
        return { ...state, salaryPaymentInfo: null };
    case 'RESET_GAME':
        return {...INITIAL_GAME_STATE, stage: GameStage.DynastySelection};
    case 'RESET_CURRENT_TURN':
        return {
            ...state,
            diceValues: [0, 0],
            isRolling: false,
            isMoving: false,
            stepsToMove: 0,
            showCityModal: false,
            showEventModal: false,
            isFetchingEvent: false,
            showOpponentCityModal: false,
            showStealMoneyModal: false,
            eventForSteal: null,
            error: null,
            justEscapedIsland: false,
            tollPaymentInfo: null,
        };
    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toastMessage: null };
    case 'SHOW_TRAVEL_MODAL':
      return { ...state, showTravelModal: true };
    case 'TRAVEL_TO_SPACE': {
      const { destinationIndex } = action.payload;
      const currentPlayer = state.players[state.currentPlayerIndex];
      let moneyGained = 0;
      if (destinationIndex < currentPlayer.position) {
        let salary = 200;
        let bonusPercent = 0;
        if (currentPlayer.items.some(i => i.effect === 'SALARY_BONUS_20')) bonusPercent = 0.2;
        else if (currentPlayer.items.some(i => i.effect === 'SALARY_BONUS_10')) bonusPercent = 0.1;
        
        moneyGained = Math.floor(salary * (1 + bonusPercent));
      }
      const updatedPlayers = state.players.map((p, i) => i === state.currentPlayerIndex ? { ...p, position: destinationIndex, money: p.money + moneyGained } : p);
      return { ...state, players: updatedPlayers, showTravelModal: false, justTraveled: true };
    }
    case 'CLEAR_JUST_TRAVELED_FLAG':
      return { ...state, justTraveled: false };
    case 'CLEAR_SHOULD_PROCESS_TURN_FLAG':
      return { ...state, shouldProcessTurnAfterEvent: false };
    case 'SHOW_UPGRADE_MODAL':
      return { ...state, showUpgradeModal: true };
    case 'UPGRADE_CITY': {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const city = state.board[currentPlayer.position];
      const upgradeCost = Math.floor(city.price! / 2);

      if (currentPlayer.money < upgradeCost || !city.price) return state;
      
      const currentMultiplier = city.multiplier || 1;
      if (currentMultiplier >= 3) return state;

      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, money: currentPlayer.money - upgradeCost };
      
      const updatedBoard = [...state.board];
      updatedBoard[currentPlayer.position] = { ...city, multiplier: (currentMultiplier + 1) as 2 | 3 };

      return { ...state, players: updatedPlayers, board: updatedBoard, showUpgradeModal: false };
    }
    case 'PROCESS_TREASURY_LANDING': {
        const newVisitCount = state.treasuryVisitCount + 1;
        const isOddVisit = newVisitCount % 2 !== 0;
        let updatedPlayers = [...state.players];
        const currentPlayer = updatedPlayers[state.currentPlayerIndex];
        
        if (isOddVisit) {
            // Pay tax logic
            let tax = state.treasuryTaxAmount;
            const exemptionItem = currentPlayer.items.find(i => i.effect === 'TREASURY_EXEMPTION');
            if (exemptionItem) {
                let discountPercent = 0.6;
                tax = Math.floor(tax * (1 - discountPercent));
            }

            updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, money: currentPlayer.money - tax };
            const newTreasury = state.treasury + Math.abs(tax);
            const newTaxAmount = Math.floor(state.treasuryTaxAmount * 1.5);

            let toastMsg = `국고에 홀수번째 방문! 세금 ₩${tax.toLocaleString()}을 납부합니다. 다음 세금은 50% 증가합니다.`;
            if(exemptionItem) {
                if (tax < 0) {
                    toastMsg = `아이템 효과! '${exemptionItem.name}'으로 세금을 면제받고 ₩${(-tax).toLocaleString()}을 환급받습니다!`;
                } else {
                    toastMsg = `아이템 효과! '${exemptionItem.name}'으로 세금이 감면되어 ₩${tax.toLocaleString()}만 납부합니다.`;
                }
            }

            return {
                ...state,
                players: updatedPlayers,
                treasury: newTreasury,
                treasuryTaxAmount: newTaxAmount,
                treasuryVisitCount: newVisitCount,
                toastMessage: toastMsg
            };
        } else {
            // Claim treasury logic
            const moneyGained = state.treasury;
            updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, money: currentPlayer.money + moneyGained };
            
            return {
                ...state,
                players: updatedPlayers,
                treasury: 0, // Reset treasury
                treasuryTaxAmount: 80, // Reset tax
                treasuryVisitCount: newVisitCount,
                lastGoldChange: moneyGained,
                toastMessage: `국고에 짝수번째 방문! 국고 자금 ₩${moneyGained.toLocaleString()}을 모두 획득합니다!`
            };
        }
    }
    case 'ACQUIRE_ITEM': {
        const { item } = action.payload;
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer.items.length >= 5) {
            return { ...state, toastMessage: '아이템을 더 이상 가질 수 없습니다 (최대 5개).' };
        }
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, items: [...currentPlayer.items, item] };
        
        if (currentPlayer.isAI) {
            return {
                ...state,
                players: updatedPlayers,
                toastMessage: `${currentPlayer.name}(이)가 아이템 '${item.name}${item.isAdvanced ? ' (고급)' : ''}'을(를) 획득했습니다!`
            };
        } else {
            return {
                ...state,
                players: updatedPlayers,
                showItemModal: true,
                acquiredItem: item
            };
        }
    }
    default:
      return state;
  }
};

const generateBackgroundPattern = (specialSpacesData: { icon?: string; name: string }[]): React.CSSProperties => {
    if (specialSpacesData.length === 0) return {};
    const data = specialSpacesData.length > 1 ? [specialSpacesData[0], specialSpacesData[1]] : [specialSpacesData[0], specialSpacesData[0]];

    const svg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='250' height='250' opacity='0.2'>
            <style>
                .icon { font-size: 60px; font-family: sans-serif; }
                .name { font-size: 24px; font-family: 'Jua', sans-serif; fill: #444; font-weight: bold; }
            </style>
            <g transform='rotate(15, 60, 60)'>
              <text x='50' y='70' text-anchor='middle' class='icon'>${data[0].icon || ''}</text>
              <text x='50' y='105' text-anchor='middle' class='name'>${data[0].name}</text>
            </g>
            <g transform='rotate(-10, 190, 180)'>
              <text x='180' y='170' text-anchor='middle' class='icon'>${data[1].icon || ''}</text>
              <text x='180' y='205' text-anchor='middle' class='name'>${data[1].name}</text>
            </g>
        </svg>
    `;
    const backgroundUrl = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return { backgroundImage: backgroundUrl };
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const prevStateRef = useRef<GameState>();
  useEffect(() => {
      prevStateRef.current = state;
  });
  const prevState = prevStateRef.current;

  const toggleMute = () => setIsMuted(prev => !prev);
  
  const playSound = useCallback((soundUrl: string, volume = 0.5) => {
    if (isMuted) return;
    try {
        if (!soundCache[soundUrl]) {
            soundCache[soundUrl] = new Audio(soundUrl);
            soundCache[soundUrl].volume = volume;
        }
        soundCache[soundUrl].currentTime = 0;
        soundCache[soundUrl].play().catch(e => {
            // Autoplay was prevented. This is a common browser restriction.
        });
    } catch (e) {
        console.error("Error playing sound:", e);
    }
  }, [isMuted]);

  const selectDynasty = (dynasty: Dynasty, board: BoardSpace[]) => dispatch({ type: 'SELECT_DYNASTY', payload: { dynasty, board } });
  const selectVictoryCondition = (condition: VictoryCondition) => dispatch({ type: 'SELECT_VICTORY_CONDITION', payload: condition });

  const startGame = (setup: GameSetupOptions) => {
    const shuffledAINames = [...CUTE_AI_NAMES].sort(() => 0.5 - Math.random());
    const shuffledEmojis = [...PLAYER_EMOJIS].sort(() => 0.5 - Math.random());
    const players: Player[] = Array.from({ length: setup.humanPlayers + setup.aiPlayers }, (_, i) => ({
      id: i,
      name: i < setup.humanPlayers ? setup.playerNames[i] : shuffledAINames[i - setup.humanPlayers],
      money: 1500,
      position: 0,
      isAI: i >= setup.humanPlayers,
      color: PLAYER_COLORS[i],
      turnsOnIsland: 0,
      items: [],
      emoji: shuffledEmojis[i % shuffledEmojis.length],
    }));
    dispatch({ type: 'START_GAME', payload: players });
  };
  
  const handleTurnEnd = useCallback(() => {
    dispatch({ type: 'END_TURN' });
    setIsProcessingTurn(false);
    setIsAIProcessing(false);
  }, []);

  const handleContinueTurn = useCallback(() => {
    dispatch({ type: 'CONTINUE_TURN' });
    setIsProcessingTurn(false);
    setIsAIProcessing(false);
  }, []);
  
  const handleResetTurn = () => {
    dispatch({ type: 'RESET_CURRENT_TURN' });
    setIsProcessingTurn(false);
    setIsAIProcessing(false);
  };

  const checkVictoryConditions = useCallback((currentPlayers: Player[]) => {
    // Bankruptcy check
    const activePlayers = currentPlayers.filter(p => p.money >= 0);
    if (currentPlayers.length > 1 && activePlayers.length === 1) {
        dispatch({ type: 'SET_WINNER', payload: { winner: activePlayers[0], reason: '상대방을 모두 파산시켰습니다!' } });
        return true;
    }

    // Monopoly check
    const sides = [[1,9], [11,19], [21,29], [31,39]];
    for(const player of currentPlayers) {
        for(const side of sides) {
            const spacesInSide = state.board.slice(side[0], side[1] + 1).filter(s => s.type === 'city');
            const ownedSpaces = spacesInSide.filter(s => s.owner === player.id);
            if (spacesInSide.length > 0 && ownedSpaces.length === spacesInSide.length) {
                dispatch({ type: 'SET_WINNER', payload: { winner: player, reason: `한 라인을 독점했습니다!` } });
                return true;
            }
        }
    }
    return false;
  }, [state.board, dispatch]);

  const processTurn = useCallback(async () => {
    // FIX: Passed `state.players` to `checkVictoryConditions` to fix missing argument error.
    if (checkVictoryConditions(state.players)) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const currentSpace = state.board[currentPlayer.position];

    const afterSpaceAction = () => {
        const rolledDoubles = state.diceValues[0] === state.diceValues[1] && state.diceValues[0] > 0;
        if (rolledDoubles && !state.justEscapedIsland) {
            handleContinueTurn();
        } else {
            handleTurnEnd();
        }
    }

    if (currentSpace.type === 'start') {
        let baseSalary = 200;
        let salaryBonusPercent = 0;
        
        if (currentPlayer.items.some(i => i.effect === 'SALARY_BONUS_20')) {
            salaryBonusPercent = 0.2;
        } else if (currentPlayer.items.some(i => i.effect === 'SALARY_BONUS_10')) {
            salaryBonusPercent = 0.1;
        }
        baseSalary *= (1 + salaryBonusPercent);

        const bonus = Math.floor(baseSalary * 0.5);

        const updatedPlayers = state.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, money: p.money + bonus } : p
        );
        dispatch({ type: 'UPDATE_PLAYERS', payload: updatedPlayers });
        dispatch({ type: 'SHOW_TOAST', payload: `출발칸 도착 보너스! ₩${bonus.toLocaleString()}을 추가로 받습니다!` });
        
        setTimeout(afterSpaceAction, 1500);
    } else if (currentSpace.type === 'city') {
      if (currentSpace.owner === undefined) {
          dispatch({ type: 'TRIGGER_CITY_ACTION' });
      } else if (currentSpace.owner !== state.currentPlayerIndex) {
        playSound(SOUNDS.PAY_TOLL);
        dispatch({ type: 'PAY_TOLL', payload: { fromPlayerIndex: state.currentPlayerIndex, toPlayerIndex: currentSpace.owner, spaceIndex: currentPlayer.position } });
        
        setTimeout(() => {
            if(currentPlayer.isAI) {
                const price = currentSpace.price! * 2;
                if (currentPlayer.money >= price * 1.5) {
                     dispatch({ type: 'BUY_OPPONENT_CITY', payload: { playerIndex: state.currentPlayerIndex, spaceIndex: currentPlayer.position } });
                }
                 setTimeout(afterSpaceAction, 1000);
            } else {
                // FIX: Corrected typo to match action type definition.
                dispatch({ type: 'TRIGGER_OPPONENT_CITY_ACTION' });
            }
        }, 3500);
      } else { // Landed on own city
        if ((currentSpace.multiplier || 1) < 3) {
            if (currentPlayer.isAI) {
                const upgradeCost = Math.floor(currentSpace.price! / 2);
                if(currentPlayer.money > upgradeCost * 2) {
                    dispatch({ type: 'UPGRADE_CITY' });
                }
                setTimeout(afterSpaceAction, 1000);
            } else {
                dispatch({ type: 'SHOW_UPGRADE_MODAL' });
            }
        } else {
            setTimeout(afterSpaceAction, 1000);
        }
      }
    } else if (currentSpace.type === 'event') {
        dispatch({ type: 'FETCH_EVENT_START' });
        playSound(SOUNDS.EVENT_CARD);

        const event = await generateHistoricalEvent(state.dynasty!);
        dispatch({type: 'APPLY_EVENT', payload: event});
    } else if (currentSpace.type === 'item') {
        const effectGroups: { [key: string]: ItemEffect[] } = {
            TOLL_INCREASE: ['TOLL_INCREASE_10', 'TOLL_INCREASE_20'],
            SALARY_BONUS: ['SALARY_BONUS_10', 'SALARY_BONUS_20'],
            TOLL_DISCOUNT: ['TOLL_DISCOUNT_10', 'TOLL_DISCOUNT_20'],
            TREASURY: ['TREASURY_EXEMPTION'],
            ISLAND: ['ISLAND_STAY_REDUCED_1'],
            LAND_PURCHASE_DISCOUNT: ['LAND_PURCHASE_DISCOUNT_10', 'LAND_PURCHASE_DISCOUNT_20'],
        };

        const playerEffectGroups = new Set<string>();
        currentPlayer.items.forEach(item => {
            for (const groupName in effectGroups) {
                if (effectGroups[groupName].includes(item.effect)) {
                    playerEffectGroups.add(groupName);
                    break;
                }
            }
        });

        const allDynastyItems = ITEMS.filter(item => item.dynasty.includes(state.dynasty!));
        const availableItems = allDynastyItems.filter(item => {
            for (const groupName in effectGroups) {
                if (effectGroups[groupName].includes(item.effect)) {
                    return !playerEffectGroups.has(groupName);
                }
            }
            return true; 
        });

        if (availableItems.length > 0) {
            const isAdvancedAttempt = Math.random() < 0.3;
            const advancedItems = availableItems.filter(i => i.isAdvanced);
            const normalItems = availableItems.filter(i => !i.isAdvanced);

            let chosenItem: Item | null = null;
            if (isAdvancedAttempt && advancedItems.length > 0) {
                chosenItem = advancedItems[Math.floor(Math.random() * advancedItems.length)];
            } else if (normalItems.length > 0) {
                chosenItem = normalItems[Math.floor(Math.random() * normalItems.length)];
            } else if (advancedItems.length > 0) {
                chosenItem = advancedItems[Math.floor(Math.random() * advancedItems.length)];
            }
            
            if (chosenItem) {
                dispatch({ type: 'ACQUIRE_ITEM', payload: { item: chosenItem } });
            } else {
                 dispatch({ type: 'SHOW_TOAST', payload: '획득할 수 있는 새로운 아이템이 없습니다.' });
            }
        } else {
            dispatch({ type: 'SHOW_TOAST', payload: '더 이상 획득할 수 있는 아이템이 없습니다.' });
        }

        if (currentPlayer.isAI) {
            setTimeout(afterSpaceAction, 1500);
        }
    } else if (currentSpace.type === 'travel') {
        if (currentPlayer.isAI) {
            setTimeout(() => {
                const destinationIndex = chooseTravelDestinationForAI(state);
                const destinationName = state.board[destinationIndex].name;
                dispatch({ type: 'SHOW_TOAST', payload: `${currentPlayer.name}(이)가 순간이동으로 ${destinationName}(으)로 이동합니다!` });
                dispatch({ type: 'TRAVEL_TO_SPACE', payload: { destinationIndex } });
            }, 1500);
        } else {
            dispatch({ type: 'SHOW_TRAVEL_MODAL' });
        }
    } else if (currentSpace.type === 'treasury') {
        dispatch({ type: 'PROCESS_TREASURY_LANDING' });
        setTimeout(afterSpaceAction, 1500);
    } else {
      setTimeout(afterSpaceAction, 1000);
    }
  }, [state, handleTurnEnd, checkVictoryConditions, handleContinueTurn, playSound]);

  useEffect(() => {
    if (state.stage === GameStage.Playing) {
        const hasChanged = state.players.some((p, i) => p.money !== (INITIAL_GAME_STATE.players[i]?.money ?? 1500));
        if (hasChanged) {
            checkVictoryConditions(state.players);
        }
    }
  }, [state.players, state.stage, checkVictoryConditions]);
  
  useEffect(() => {
    if (state.stage !== GameStage.Playing || state.victoryCondition?.type !== 'TIME' || state.winner) return;

    const timer = setInterval(() => {
        const elapsed = (Date.now() - state.gameStartTime!) / 1000 / 60;
        if (elapsed >= state.victoryCondition!.duration!) {
            let winner: Player | null = null;
            let maxAssets = -1;
            
            state.players.forEach(player => {
                const propertyValue = state.board
                    .filter(s => s.owner === player.id && s.price)
                    .reduce((sum, s) => sum + s.price!, 0);
                const totalAssets = player.money + propertyValue;

                if (totalAssets > maxAssets) {
                    maxAssets = totalAssets;
                    winner = player;
                }
            });

            if (winner) {
                dispatch({ type: 'SET_WINNER', payload: { winner, reason: `시간 종료! 자산 총합 ₩${maxAssets.toLocaleString()}으로 승리했습니다!` }});
            }
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [state.stage, state.gameStartTime, state.victoryCondition, state.winner, state.players, state.board]);
  
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isProcessingTurn) {
        timer = setTimeout(() => {
            const isWaitingForUserAction = state.showCityModal || state.showOpponentCityModal || state.showStealMoneyModal || state.showStealPropertyModal || state.showTravelModal || state.showUpgradeModal || state.showItemModal || (state.showEventModal && !state.isFetchingEvent);
            const isWaitingForAPI = state.isFetchingEvent;

            if (isWaitingForAPI) {
                 console.warn("API call seems to be stuck. Triggering recovery.");
                 dispatch({ type: 'SET_ERROR', payload: '서버와 통신이 원활하지 않습니다. 턴을 다시 시작해주세요.' });
                 dispatch({ type: 'CLOSE_MODALS' });
            } else if (!isWaitingForUserAction) {
                console.warn("Game seems to be stuck. Triggering recovery.");
                dispatch({ type: 'SET_ERROR', payload: '게임이 멈춘 것 같습니다. 턴을 다시 시작해주세요.' });
            }
        }, 15000);
    }
    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [isProcessingTurn, state.showCityModal, state.showOpponentCityModal, state.showStealMoneyModal, state.showStealPropertyModal, state.showEventModal, state.isFetchingEvent, state.showTravelModal, state.showUpgradeModal, state.showItemModal]);

  useEffect(() => {
    if (state.turnShouldEnd) {
        const delay = state.justStayedOnIsland ? 2500 : 1000;
        const timer = setTimeout(() => {
            handleTurnEnd();
        }, delay);
        return () => clearTimeout(timer);
    }
  }, [state.turnShouldEnd, state.justStayedOnIsland, handleTurnEnd]);
  
  useEffect(() => {
    if (!state.isMoving) return;
    const moveTimer = setTimeout(() => {
        if (state.stepsToMove > 0) {
            playSound(SOUNDS.MOVE_PAWN, 0.2);
            dispatch({ type: 'MOVE_ONE_STEP' });
        } else {
            dispatch({ type: 'FINISH_MOVE' });
        }
    }, 200);
    return () => clearTimeout(moveTimer);
  }, [state.isMoving, state.stepsToMove, playSound]);
  
  useEffect(() => {
    const moveFinished = !state.isMoving && (state.diceValues[0] > 0);
    if (state.stage === GameStage.Playing && moveFinished && !isProcessingTurn) {
        setIsProcessingTurn(true);
        setTimeout(processTurn, 500); 
    }
  }, [state.isMoving, state.diceValues, state.stage, isProcessingTurn, processTurn]);

  useEffect(() => {
    if (state.justTraveled) {
      dispatch({ type: 'CLEAR_JUST_TRAVELED_FLAG' });
      setIsProcessingTurn(true);
      setTimeout(processTurn, 500);
    }
  }, [state.justTraveled, processTurn, dispatch]);
  
  useEffect(() => {
    if (prevState?.showEventModal && !state.showEventModal && prevState?.shouldProcessTurnAfterEvent) {
      dispatch({ type: 'CLEAR_SHOULD_PROCESS_TURN_FLAG' });
      setIsProcessingTurn(true);
      setTimeout(processTurn, 100);
    }
  }, [state.showEventModal, prevState, processTurn, dispatch]);
  
  useEffect(() => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (state.stage === GameStage.Playing && currentPlayer?.isAI && !isProcessingTurn && (state.diceValues[0] === 0) && !isAIProcessing) {
        setIsAIProcessing(true);
        dispatch({ type: 'SET_IS_ROLLING', payload: true });
        playSound(SOUNDS.DICE_ROLL);
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
  }, [state.currentPlayerIndex, state.stage, state.players, isProcessingTurn, state.diceValues, isAIProcessing, handleTurnEnd, playSound]);

  useEffect(() => {
    if (state.toastMessage) {
        const timer = setTimeout(() => {
            dispatch({ type: 'CLEAR_TOAST' });
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [state.toastMessage]);
  
  const handleAIActionAndEndTurn = useCallback(() => {
    if (state.turnShouldEnd) {
      handleTurnEnd();
      return;
    }
    const rolledDoubles = state.diceValues[0] === state.diceValues[1] && state.diceValues[0] > 0;
    if (rolledDoubles && !state.justEscapedIsland) {
        handleContinueTurn();
    } else {
        handleTurnEnd();
    }
  }, [state.diceValues, state.justEscapedIsland, state.turnShouldEnd, handleContinueTurn, handleTurnEnd]);

  useEffect(() => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (state.showCityModal && currentPlayer.isAI) {
        const timer = setTimeout(() => {
            const currentSpace = state.board[currentPlayer.position];
            const basePrice = currentSpace.price!;

            let discountPercent = 0;
            if (currentPlayer.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_20')) {
                discountPercent = 0.2;
            } else if (currentPlayer.items.some(i => i.effect === 'LAND_PURCHASE_DISCOUNT_10')) {
                discountPercent = 0.1;
            }
            const price = Math.floor(basePrice * (1 - discountPercent));
            
            if (currentPlayer.money >= price * 1.5) {
                playSound(SOUNDS.BUY_CITY);
                dispatch({ type: 'BUY_CITY', payload: { playerIndex: state.currentPlayerIndex } });
            }
            
            dispatch({ type: 'CLOSE_MODALS' }); 
            
            handleAIActionAndEndTurn();

        }, 4000);

        return () => clearTimeout(timer);
    }
  }, [state.showCityModal, state.currentPlayerIndex, state.players, state.board, handleAIActionAndEndTurn, playSound]);
  
  useEffect(() => {
      if (state.acquiredItem) {
          playSound(SOUNDS.ITEM_ACQUIRE);
      }
  }, [state.acquiredItem, playSound]);

  useEffect(() => {
      if (state.salaryPaymentInfo) {
          playSound(SOUNDS.SALARY);
      }
  }, [state.salaryPaymentInfo, playSound]);
  
  useEffect(() => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (state.showEventModal && !state.isFetchingEvent && currentPlayer.isAI) {
        const timer = setTimeout(() => {
            if(state.shouldProcessTurnAfterEvent) {
                dispatch({ type: 'CLOSE_MODALS' });
                // The main effect handler for `shouldProcessTurnAfterEvent` will trigger `processTurn`
            } else {
                dispatch({ type: 'CLOSE_MODALS' });
                handleAIActionAndEndTurn();
            }
        }, 4000);
        return () => clearTimeout(timer);
    }
}, [state.showEventModal, state.isFetchingEvent, state.currentPlayerIndex, state.players, state.shouldProcessTurnAfterEvent, handleAIActionAndEndTurn]);

  const getSpecialSpacesData = () => {
    if (!state.board || state.board.length === 0 || state.specialSpaces.x3.length === 0) return [];
    const { x2, x3 } = state.specialSpaces;
    const x3Space = state.board[x3[0]];
    const randomX2Space = state.board[x2[Math.floor(Math.random() * x2.length)]];
    
    const data: BoardSpace[] = [];
    if (x3Space) data.push(x3Space);
    if (randomX2Space) data.push(randomX2Space);
    
    return data.filter(Boolean);
  }

  const backgroundStyle = state.stage === GameStage.Playing ? generateBackgroundPattern(getSpecialSpacesData()) : {};

  return (
    <div className="bg-amber-50 min-h-screen flex items-center justify-center p-2 sm:p-4 background-container" style={backgroundStyle}>
      <div className="w-full max-w-7xl mx-auto">
        {state.stage === GameStage.DynastySelection && <DynastySelection onSelectDynasty={selectDynasty} />}
        {state.stage === GameStage.VictoryConditionSelection && <VictoryConditionSelection onSelect={selectVictoryCondition} />}
        {state.stage === GameStage.Setup && <GameSetup onStartGame={startGame} />}
        {state.stage === GameStage.Playing && <GameScreen gameState={state} dispatch={dispatch} onTurnEnd={handleTurnEnd} onRestart={() => setShowRestartConfirm(true)} onContinueTurn={handleContinueTurn} onResetTurn={handleResetTurn} playSound={playSound} isMuted={isMuted} toggleMute={toggleMute} />}
        {state.stage === GameStage.GameOver && <GameScreen gameState={state} dispatch={dispatch} onTurnEnd={()=>{}} onRestart={() => setShowRestartConfirm(true)} onContinueTurn={() => {}} onResetTurn={() => {}} playSound={playSound} isMuted={isMuted} toggleMute={toggleMute} />}

        {showRestartConfirm && (
          <ConfirmModal
            title="게임 다시하기"
            message="정말 처음으로 돌아가시겠습니까? 현재 게임 내용은 모두 사라집니다."
            onConfirm={() => { dispatch({ type: 'RESET_GAME' }); setShowRestartConfirm(false); }}
            onCancel={() => setShowRestartConfirm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;