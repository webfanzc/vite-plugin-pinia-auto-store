
/* eslint-disable */
// @ts-nocheck
import { storeToRefs } from 'pinia'
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

import aBStore from './store/a-b'
import counterStore from './store/counter'
import testStore from './store/test'
import userStore from './store/user'

import store from './store'

type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: any[]) => any
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

type StoreExports = {
  aB: typeof aBStore
  counter: typeof counterStore
  test: typeof testStore
  user: typeof userStore
}

export function useStore<T extends keyof StoreExports>(
  storeName: T
): StoreToRefs<StoreExports[T]> {
  const storeExports = {
    aB: aBStore,
    counter: counterStore,
    test: testStore,
    user: userStore,
  } as StoreExports

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs } as StoreToRefs<StoreExports[T]>
}
