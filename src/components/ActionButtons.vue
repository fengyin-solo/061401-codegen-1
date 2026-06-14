<script setup lang="ts">
interface ActionButton {
  label: string
  icon: string
  description: string
  action: () => void
  disabled: boolean
  bgClass: string
  hoverClass: string
}

interface Props {
  canGatherWood: boolean
  canGatherStone: boolean
  canHunt: boolean
  canDrink: boolean
  canBuildShelter: boolean
  disabled: boolean
  isNight: boolean
  shelterLevel: number
  maxShelterLevel: number
  shelterCostWood: number
  shelterCostStone: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  gatherWood: []
  gatherStone: []
  hunt: []
  drink: []
  buildShelter: []
}>()

function getButtonDisabled(index: number): boolean {
  switch (index) {
    case 0:
      return !props.canGatherWood
    case 1:
      return !props.canGatherStone
    case 2:
      return !props.canHunt
    case 3:
      return !props.canDrink
    case 4:
      return !props.canBuildShelter
    default:
      return false
  }
}

const buttons: ActionButton[] = [
  {
    label: '采集木头',
    icon: '🪵',
    description: '获得木材，消耗体力',
    action: () => emit('gatherWood'),
    disabled: false,
    bgClass: 'bg-amber-900/40',
    hoverClass: 'hover:bg-amber-800/60',
  },
  {
    label: '采集石头',
    icon: '🪨',
    description: '获得石头，消耗体力',
    action: () => emit('gatherStone'),
    disabled: false,
    bgClass: 'bg-gray-700/40',
    hoverClass: 'hover:bg-gray-600/60',
  },
  {
    label: '打猎',
    icon: '🏹',
    description: '回复生命，增加饥饿，消耗木材',
    action: () => emit('hunt'),
    disabled: false,
    bgClass: 'bg-red-900/40',
    hoverClass: 'hover:bg-red-800/60',
  },
  {
    label: '喝水',
    icon: '💧',
    description: '减少口渴，消耗木材烧水',
    action: () => emit('drink'),
    disabled: false,
    bgClass: 'bg-blue-900/40',
    hoverClass: 'hover:bg-blue-800/60',
  },
  {
    label: '搭建庇护所',
    icon: '🏠',
    description: '消耗资源，提升夜晚防御力',
    action: () => emit('buildShelter'),
    disabled: false,
    bgClass: 'bg-emerald-900/40',
    hoverClass: 'hover:bg-emerald-800/60',
  },
]
</script>

<template>
  <div class="bg-game-card rounded-2xl p-6 border border-game-border shadow-xl">
    <h2 class="text-xl font-bold text-white mb-5 flex items-center gap-2">
      <span>⚡</span>
      <span>行动</span>
    </h2>

    <div
      v-if="shelterLevel < maxShelterLevel"
      class="mb-4 p-3 rounded-xl border border-game-border bg-gray-800/30"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-sm">🏠 庇护所等级</span>
        <span class="text-emerald-400 font-bold">{{ shelterLevel }} / {{ maxShelterLevel }}</span>
      </div>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>升级消耗：🪵 {{ shelterCostWood }}  🪨 {{ shelterCostStone }}</span>
        <span v-if="isNight" class="text-indigo-400">夜晚无法施工</span>
      </div>
    </div>
    <div
      v-else
      class="mb-4 p-3 rounded-xl border border-emerald-700/50 bg-emerald-900/20"
    >
      <div class="flex items-center justify-center gap-2">
        <span class="text-emerald-400">🏠</span>
        <span class="text-emerald-400 font-medium text-sm">庇护所已达最高等级！</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="(btn, index) in buttons"
        :key="btn.label"
        @click="btn.action"
        :disabled="disabled || getButtonDisabled(index)"
        :class="[
          btn.bgClass,
          'relative p-4 rounded-xl border border-game-border transition-all duration-200',
          'flex flex-col items-center justify-center gap-2 text-center',
          disabled || getButtonDisabled(index)
            ? 'opacity-40 cursor-not-allowed'
            : [btn.hoverClass, 'hover:scale-[1.02] hover:shadow-lg cursor-pointer active:scale-[0.98]'],
        ]"
      >
        <span class="text-3xl">{{ btn.icon }}</span>
        <span class="text-white font-semibold text-sm">{{ btn.label }}</span>
        <span class="text-gray-400 text-xs">{{ btn.description }}</span>
      </button>
    </div>
  </div>
</template>
