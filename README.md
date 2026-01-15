# pinia-plugin-auto-store

A Vite plugin that automatically generates a unified `useStore` helper from your Pinia store directory, with full TypeScript support and hot reload.

## Features

- 🚀 **Auto-generate** - Automatically scans your store directory and generates a typed `useStore` helper
- 🔥 **Hot Reload** - Watches for file changes in development mode and regenerates automatically
- 📦 **Type Safe** - Full TypeScript support with proper type inference for state, getters, and actions
- 🎯 **Flexible** - Supports glob patterns for excluding files
- ⚡ **Zero Runtime** - Only runs at build time, no runtime overhead
- 🌐 **JS Compatible** - Generates `.js` files with `.d.ts` type declarations, works in both JS and TS projects

## Installation

```bash
npm install pinia-plugin-auto-store -D
# or
pnpm add pinia-plugin-auto-store -D
# or
yarn add pinia-plugin-auto-store -D
```

## Usage

### 1. Add the plugin to your Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import piniaAutoStore from 'pinia-plugin-auto-store'

export default defineConfig({
  plugins: [
    vue(),
    piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
      exclude: '**/index.{ts,js}',
    }),
  ],
})
```

### 2. Create your Pinia stores

```ts
// src/store/index.ts
import { createPinia } from 'pinia'

const store = createPinia()

export default store
```

```ts
// src/store/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export default defineStore('user', () => {
  const name = ref('Guest')
  const age = ref(0)

  function setName(newName: string) {
    name.value = newName
  }

  return { name, age, setName }
})
```

```ts
// src/store/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export default defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return { count, double, increment }
})
```

### 3. Use the generated helper in your components

```vue
<script setup lang="ts">
import { useStore } from '@/helper/use-store'

// Full type inference for store name
const user = useStore('user')
const counter = useStore('counter')

// Access state, getters, and actions with full types
console.log(user.name)       // Ref<string>
console.log(counter.double)  // ComputedRef<number>
counter.increment()          // () => void
</script>

<template>
  <div>
    <p>User: {{ user.name }}</p>
    <p>Count: {{ counter.count }} (Double: {{ counter.double }})</p>
    <button @click="counter.increment">+1</button>
  </div>
</template>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storeDir` | `string` | `'src/store'` | Directory containing your Pinia stores |
| `include` | `string \| string[]` | `'**/*.{ts,js}'` | Glob pattern(s) to include files |
| `exclude` | `string \| string[]` | `'**/index.{ts,js}'` | Glob pattern(s) to exclude files |
| `output` | `string` | `'src/helper/use-store.ts'` | Output path for the generated helper |
| `outputType` | `'ts' \| 'js'` | `undefined` | Output type. If not specified, auto-detected from `output` path extension (`.ts` → `'ts'`, `.js` → `'js'`). Defaults to `'ts'` if extension cannot be determined |
| `watch` | `boolean` | `undefined` | Enable file watching. Defaults to `true` in development mode |

## Generated Code

The plugin supports two output modes:

### TypeScript Mode (default)

When `outputType` is `'ts'` or `output` ends with `.ts`, the plugin generates a single TypeScript file with both implementation and types:

```ts
import { storeToRefs } from 'pinia'
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

import type counterStore from './store/counter'
import type userStore from './store/user'

import counterStore from './store/counter'
import userStore from './store/user'

import store from './store'

type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: unknown[]) => unknown
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

type StoreExports = {
  counter: typeof counterStore
  user: typeof userStore
}

export function useStore<T extends keyof StoreExports>(
  storeName: T
): StoreToRefs<StoreExports[T]> {
  const storeExports = {
    counter: counterStore,
    user: userStore,
  } as StoreExports

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs } as StoreToRefs<StoreExports[T]>
}
```

### JavaScript Mode

When `outputType` is `'js'` or `output` ends with `.js`, the plugin generates two files:

1. **`.js` file** - Pure JavaScript implementation
2. **`.d.ts` file** - TypeScript type declarations

#### Generated JavaScript file (`use-store.js`):

```js
/* eslint-disable */
import { storeToRefs } from 'pinia'

import counterStore from './store/counter'
import userStore from './store/user'

import store from './store'

export function useStore(storeName) {
  const storeExports = {
    counter: counterStore,
    user: userStore,
  }

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs }
}
```

#### Generated TypeScript declarations (`use-store.d.ts`):

```ts
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

import type counterStore from './store/counter'
import type userStore from './store/user'

type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: unknown[]) => unknown
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

type StoreExports = {
  counter: typeof counterStore
  user: typeof userStore
}

export function useStore<T extends keyof StoreExports>(
  storeName: T
): StoreToRefs<StoreExports[T]>
```

### Choosing the Right Mode

- **TypeScript Mode** (default): Best for TypeScript projects. Generates a single `.ts` file with full type safety.
- **JavaScript Mode**: Best for JavaScript projects or when you need separate `.js` and `.d.ts` files. Provides IntelliSense support through the `.d.ts` file.

## Requirements

- Vite 7.x
- Vue 3.x
- Pinia 3.x

## Store File Conventions

- Each store file should **default export** a `defineStore` result
- The store directory should have an `index.ts` or `index.js` that exports the Pinia instance (excluded by default)
- Store files can be either `.ts` or `.js` files

## License

MIT

## Author

[skelanimals](https://github.com/webfanzc)
