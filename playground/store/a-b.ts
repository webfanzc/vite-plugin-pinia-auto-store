import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export default defineStore('a-b', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return { count, double, increment, decrement }
})
