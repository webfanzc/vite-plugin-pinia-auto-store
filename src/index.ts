import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { createFilter } from 'vite'

type Options = Partial<{
  storeDir: string
  exclude: string | string[]
  output: string
  watch?: boolean
}>

const defaultOptions: Options = {
  storeDir: 'src/store',
  exclude: '**/index.ts',
  output: 'src/helper/use-store.ts',
}

export default function (options: Options = {}): Plugin {
  options = { ...defaultOptions, ...options, }

  const { storeDir, exclude, output, } = options as Required<Options>
  let root = process.cwd()

  const resolvePath = (target: string) => (isAbsolute(target) ? target : resolve(root, target))
  const storePath = () => resolvePath(storeDir)
  const outputPath = () => resolvePath(output)
  const outputDir = () => dirname(outputPath())
  const filter = createFilter('**/*.ts', exclude)

  async function generateConfigFiles() {
    await fs.mkdir(outputDir(), { recursive: true })
    const storeRoot = storePath()
    const storesPath = await fs.readdir(storeRoot)
    const storeNames = storesPath
      .filter(i => i.endsWith('.ts'))
      .filter(i => filter(resolve(storeRoot, i)))
      .map(i => i.replace('.ts', ''))

    // 计算从 output 文件到 store 目录的相对路径
    let relativeStorePath = relative(outputDir(), storeRoot)
    if (!relativeStorePath.startsWith('.')) {
      relativeStorePath = `./${relativeStorePath}`
    }

    const ctx = `
/* eslint-disable */
// @ts-nocheck
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'
import { storeToRefs } from 'pinia'

${storeNames.reduce(
  (str, storeName) => `${str}import ${storeName}Store from '${relativeStorePath}/${storeName}'
`,
  ''
)}

import store from '${relativeStorePath}'

type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: any[]) => any
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

export function useStore<T extends keyof typeof storeExports>(storeName: T) {
  const storeExports = {
  ${storeNames.reduce(
    (str, storeName) => `${str}  ${storeName}: ${storeName}Store,
  `,
    ''
  )}}

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs } as StoreToRefs<(typeof storeExports)[T]>
}
`
    fs.writeFile(outputPath(), ctx, 'utf-8')
  }

  return {
    name: 'pinia-plugin-auto-store',
    configResolved(config) {
      root = config.root
      options.watch = options.watch ?? config.mode === 'development'
    },
    buildStart() {
      generateConfigFiles()
    },
    configureServer(server) {
      if (!options.watch) {return}

      const debounce = (fn: () => void, delay = 100) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        return () => {
          if (timer) {clearTimeout(timer)}
          timer = setTimeout(fn, delay)
        }
      }
      const debounceGenerate = debounce(generateConfigFiles, 100)

      const watchedRoot = storePath()
      server.watcher.add(watchedRoot)
      server.watcher.on('add', (file: string) => {
        if (!file.startsWith(watchedRoot) || !file.endsWith('.ts')) {return}
        debounceGenerate()
      })
      server.watcher.on('unlink', (file: string) => {
        if (!file.startsWith(watchedRoot) || !file.endsWith('.ts')) {return}
        debounceGenerate()
      })
    },
  }
}
