# pinia-plugin-auto-store

一个 Vite 插件，自动从 Pinia store 目录生成统一的 `useStore` 辅助函数，支持完整的 TypeScript 类型和热更新。

## 特性

- 🚀 **自动生成** - 自动扫描 store 目录并生成带类型的 `useStore` 辅助函数
- 🔥 **热更新** - 开发模式下监听文件变化并自动重新生成
- 📦 **类型安全** - 完整的 TypeScript 支持，正确推断 state、getters 和 actions 的类型
- 🎯 **灵活配置** - 支持 glob 模式排除文件
- ⚡ **零运行时** - 仅在构建时运行，无运行时开销
- 🌐 **JS 兼容** - 生成 `.js` 文件和 `.d.ts` 类型声明，JS 和 TS 项目都能使用

## 安装

```bash
npm install pinia-plugin-auto-store -D
# 或
pnpm add pinia-plugin-auto-store -D
# 或
yarn add pinia-plugin-auto-store -D
```

## 使用方法

### 1. 在 Vite 配置中添加插件

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
      output: 'src/helper/use-store.js',
      exclude: '**/index.{ts,js}',
    }),
  ],
})
```

### 2. 创建 Pinia stores

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

### 3. 在组件中使用生成的辅助函数

```vue
<script setup lang="ts">
import { useStore } from '@/helper/use-store'

// store 名称有完整的类型推断
const user = useStore('user')
const counter = useStore('counter')

// 访问 state、getters 和 actions，带完整类型
console.log(user.name)       // Ref<string>
console.log(counter.double)  // ComputedRef<number>
counter.increment()          // () => void
</script>

<template>
  <div>
    <p>用户: {{ user.name }}</p>
    <p>计数: {{ counter.count }} (双倍: {{ counter.double }})</p>
    <button @click="counter.increment">+1</button>
  </div>
</template>
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `storeDir` | `string` | `'src/store'` | 包含 Pinia stores 的目录 |
| `include` | `string \| string[]` | `'**/*.{ts,js}'` | 包含文件的 glob 模式 |
| `exclude` | `string \| string[]` | `'**/index.{ts,js}'` | 排除文件的 glob 模式 |
| `output` | `string` | `'src/helper/use-store.js'` | 生成的辅助函数输出路径（会同时生成 `.js` 和 `.d.ts` 文件） |
| `watch` | `boolean` | `undefined` | 是否启用文件监听，开发模式下默认为 `true` |

## 生成的代码

插件会生成两个文件：

1. **`.js` 文件** - 纯 JavaScript 实现（JS 和 TS 项目都能使用）
2. **`.d.ts` 文件** - TypeScript 类型声明（提供完整的类型支持）

### 生成的 JavaScript 文件 (`use-store.js`):

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

### 生成的 TypeScript 类型声明 (`use-store.d.ts`):

```ts
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

import type counterStore from './store/counter'
import type userStore from './store/user'

import type store from './store'

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

这种方式的优势：
- **JavaScript 项目**可以使用辅助函数并获得完整的 IntelliSense 支持
- **TypeScript 项目**可以获得完整的类型安全
- 两者都能与 Vite 的模块解析无缝配合

## 环境要求

- Vite 7.x
- Vue 3.x
- Pinia 3.x

## Store 文件规范

- 每个 store 文件应该**默认导出** `defineStore` 的结果
- store 目录应该有一个 `index.ts` 或 `index.js` 导出 Pinia 实例（默认被排除）
- Store 文件可以是 `.ts` 或 `.js` 文件

## 许可证

MIT

## 作者

[skelanimals](https://github.com/webfanzc)
