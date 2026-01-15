
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

import type counterStore from './store/counter'
import type testStore from './store/test'
import type userStore from './store/user'


type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: unknown[]) => unknown
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

type StoreExports = {
  counter: typeof counterStore
  test: typeof testStore
  user: typeof userStore
}

export function useStore<T extends keyof StoreExports>(
  storeName: T
): StoreToRefs<StoreExports[T]>
