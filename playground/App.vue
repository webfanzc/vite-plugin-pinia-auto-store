<script setup lang="ts">
import { useStore } from './use-store'

const counter = useStore('counter')
const { name, age } = useStore('user')
const { testA, testB, getterA } = useStore('test')
</script>

<template>
  <div class="container">
    <h1>Pinia Auto Store Test</h1>

    <section>
      <h2>Counter Store</h2>
      <p>Count: {{ counter.count }}</p>
      <p>Double: {{ counter.double }}</p>
      <div class="buttons">
        <button @click="counter.decrement">-</button>
        <button @click="counter.increment">+</button>
      </div>
    </section>

    <section>
      <h2>User Store</h2>
      <p>Name: {{ name }}</p>
      <p>Age: {{ age }}</p>
      <input v-model="name" placeholder="Enter name" />
    </section>
  </div>
</template>

<style>
.container {
  max-width: 600px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

section {
  margin: 2rem 0;
  padding: 1.5rem;
  border-radius: 8px;
  background: #f5f5f5;
}

h1 {
  color: #42b883;
}

.buttons {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1.2rem;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background: #42b883;
  color: white;
}

button:hover {
  background: #3aa876;
}

input {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
