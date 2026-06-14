import { ref, computed, watch } from 'vue'
import type { GameState, LogEntry, RandomEvent, ActionType, ActionEffect } from '@/types/game'
import { randomEvents } from '@/data/events'

const STORAGE_KEY_HIGH_SCORE = 'survival_game_high_score'
const MAX_STAT = 100

const actionEffects: Record<ActionType, ActionEffect> = {
  gatherWood: {
    health: -5, hunger: 5, thirst: 3, wood: 10, stone: 0 },
  gatherStone: {
    health: -8, hunger: 6, thirst: 4, wood: 0, stone: 8 },
  hunt: {
    health: 15, hunger: -20, thirst: 5, wood: -5, stone: 0 },
  drink: {
    health: 0, hunger: 2, thirst: -25, wood: -3, stone: 0 },
  buildShelter: {
    health: -10, hunger: 8, thirst: 6, wood: -15, stone: -10 },
}

const SHELTER_COST_WOOD = 15
const SHELTER_COST_STONE = 10
const MAX_SHELTER_LEVEL = 5
const TURNS_PER_DAY = 2

const nightPenalties: Record<number, ActionEffect> = {
  0: { health: -15, hunger: 10, thirst: 8 },
  1: { health: -10, hunger: 7, thirst: 5 },
  2: { health: -6, hunger: 4, thirst: 3 },
  3: { health: -3, hunger: 2, thirst: 1 },
  4: { health: -1, hunger: 1, thirst: 0 },
  5: { health: 0, hunger: 0, thirst: 0 },
}

const actionNames: Record<ActionType, string> = {
  gatherWood: '采集木头',
  gatherStone: '采集石头',
  hunt: '打猎',
  drink: '喝水',
  buildShelter: '搭建庇护所',
}

export function useGame() {
  const state = ref<GameState>({
    health: 80,
    hunger: 30,
    thirst: 30,
    wood: 10,
    stone: 5,
    turn: 0,
    isGameOver: false,
    logs: [],
    shelterLevel: 0,
    isNight: false,
    totalShelterBonus: 0,
  })

  const highScore = ref<number>(0)
  let logIdCounter = 0

  const canAct = computed(() => !state.value.isGameOver)

  function loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10) || 0
      }
    } catch (e) {
      highScore.value = 0
    }
  }

  function saveHighScore() {
    if (state.value.turn > highScore.value) {
      highScore.value = state.value.turn
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore.value))
      } catch (e) {
        // ignore
      }
    }
  }

  function addLog(text: string, type: LogEntry['type'] = 'action') {
    state.value.logs.unshift({
      id: ++logIdCounter,
      text,
      type,
      turn: state.value.turn,
    })
    if (state.value.logs.length > 50) {
      state.value.logs.pop()
    }
  }

  function clampStat(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function applyEffects(effects: ActionEffect) {
    if (effects.health !== undefined) {
      state.value.health = clampStat(state.value.health + effects.health, 0, MAX_STAT)
    }
    if (effects.hunger !== undefined) {
      state.value.hunger = clampStat(state.value.hunger + effects.hunger, 0, MAX_STAT)
    }
    if (effects.thirst !== undefined) {
      state.value.thirst = clampStat(state.value.thirst + effects.thirst, 0, MAX_STAT)
    }
    if (effects.wood !== undefined) {
      state.value.wood = Math.max(0, state.value.wood + effects.wood)
    }
    if (effects.stone !== undefined) {
      state.value.stone = Math.max(0, state.value.stone + effects.stone)
    }
  }

  function getRandomEvent(): RandomEvent {
    const index = Math.floor(Math.random() * randomEvents.length)
    return randomEvents[index]
  }

  function checkGameOver() {
    if (state.value.health <= 0 || state.value.hunger >= MAX_STAT || state.value.thirst >= MAX_STAT) {
      state.value.isGameOver = true
      saveHighScore()
      addLog('你没能在荒野中生存下来...', 'system')
    }
  }

  function canPerformAction(action: ActionType): boolean {
    if (state.value.isGameOver) return false
    if (action === 'buildShelter') {
      if (state.value.isNight) return false
      if (state.value.shelterLevel >= MAX_SHELTER_LEVEL) return false
    }
    const effects = actionEffects[action]
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function performNightSettlement(): boolean {
    const penalty = nightPenalties[state.value.shelterLevel]
    const basePenalty = nightPenalties[0]

    const healthBonus = Math.abs(basePenalty.health || 0) - Math.abs(penalty.health || 0)
    state.value.totalShelterBonus += healthBonus

    applyEffects(penalty)

    addLog(`🌙 夜晚降临，庇护所等级 ${state.value.shelterLevel} 为你抵御了部分严寒`, 'system')

    if (healthBonus > 0) {
      addLog(`🏠 庇护所加成：减少 ${healthBonus} 点生命值损耗`, 'good')
    } else {
      addLog(`❄️ 没有庇护所，严寒使你的生命值大幅下降`, 'bad')
    }

    checkGameOver()
    return state.value.isGameOver
  }

  function updateDayNightCycle(newTurn: number): boolean {
    const dayCycle = Math.floor((newTurn - 1) / TURNS_PER_DAY)
    const wasNight = state.value.isNight
    state.value.isNight = dayCycle % 2 === 1

    if (!wasNight && state.value.isNight) {
      return performNightSettlement()
    } else if (wasNight && !state.value.isNight) {
      addLog(`☀️ 新的一天开始了，抓紧时间收集资源吧`, 'system')
    }
    return false
  }

  function performAction(action: ActionType) {
    if (!canPerformAction(action)) return

    const effects = actionEffects[action]
    applyEffects(effects)

    checkGameOver()
    if (state.value.isGameOver) return

    if (action === 'buildShelter') {
      state.value.shelterLevel++
    }

    state.value.turn++
    const newTurn = state.value.turn

    const timeOfDay = state.value.isNight ? '🌙 夜晚' : '☀️ 白天'
    addLog(`第 ${newTurn} 回合 ${timeOfDay}：${actionNames[action]}`, 'action')

    if (action === 'buildShelter') {
      addLog(`🏠 庇护所已升级到 ${state.value.shelterLevel} 级！`, 'good')
    }

    const diedAtNight = updateDayNightCycle(newTurn)
    if (diedAtNight) return

    if (state.value.isGameOver) return

    const event = getRandomEvent()
    applyEffects(event.effects)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function gatherWood() {
    performAction('gatherWood')
  }

  function gatherStone() {
    performAction('gatherStone')
  }

  function hunt() {
    performAction('hunt')
  }

  function drink() {
    performAction('drink')
  }

  function buildShelter() {
    performAction('buildShelter')
  }

  function restart() {
    state.value = {
      health: 80,
      hunger: 30,
      thirst: 30,
      wood: 10,
      stone: 5,
      turn: 0,
      isGameOver: false,
      logs: [],
      shelterLevel: 0,
      isNight: false,
      totalShelterBonus: 0,
    }
    logIdCounter = 0
    addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')
  }

  loadHighScore()
  addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')

  return {
    state,
    highScore,
    canAct,
    canPerformAction,
    gatherWood,
    gatherStone,
    hunt,
    drink,
    buildShelter,
    restart,
    SHELTER_COST_WOOD,
    SHELTER_COST_STONE,
    MAX_SHELTER_LEVEL,
  }
}
