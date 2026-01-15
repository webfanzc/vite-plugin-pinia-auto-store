
/* eslint-disable */
import { storeToRefs } from 'pinia'

import counterStore from './store/counter'
import testStore from './store/test'
import userStore from './store/user'


import store from './store'

export function useStore(storeName) {
  const storeExports = {
    counter: counterStore,
    test: testStore,
    user: userStore,
  }

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs }
}
