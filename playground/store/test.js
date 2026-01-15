import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export default defineStore('test', () => {
  const testA = ref(0)
  const testB = ref('')

  const getterA = computed(() => testA.value + testB.value)

  return { testA, testB, getterA }
})
