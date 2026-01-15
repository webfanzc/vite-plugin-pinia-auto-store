import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { FilterPattern, Plugin } from 'vite'
import { createFilter } from 'vite'

type Options = Partial<{
  storeDir: string
  include: FilterPattern
  exclude: FilterPattern
  output: string
  watch: boolean
}>

const defaultOptions: Options = {
  storeDir: 'src/store',
  include: '**/*.{ts,js}',
  exclude: '**/index.{ts,js}',
  output: 'src/helper/use-store.js',
}

export default function (options: Options = {}): Plugin {
  options = { ...defaultOptions, ...options, }

  const { storeDir, include, exclude, output, } = options as Required<Options>
  let root = process.cwd()

  const resolvePath = (target: string) => (isAbsolute(target) ? target : resolve(root, target))
  const storePath = () => resolvePath(storeDir)
  const outputPath = () => {
    const path = resolvePath(output)
    // 确保输出 .js 文件
    return path.endsWith('.js') ? path : path.replace(/\.ts$/, '.js')
  }
  const outputDtsPath = () => outputPath().replace(/\.js$/, '.d.ts')
  const outputDir = () => dirname(outputPath())
  const filter = createFilter(include, exclude)

  async function generateConfigFiles() {
    await fs.mkdir(outputDir(), { recursive: true })
    const storeRoot = storePath()
    const storesPath = await fs.readdir(storeRoot)
    const storeNames = storesPath
      .filter(i => filter(resolve(storeRoot, i)))
      .map(i => i.replace(/\.(ts|js)$/, ''))

    // 计算从 output 文件到 store 目录的相对路径
    let relativeStorePath = relative(outputDir(), storeRoot)
    if (!relativeStorePath.startsWith('.')) {
      relativeStorePath = `./${relativeStorePath}`
    }

    // 生成 JS 文件
    const jsContent = `
/* eslint-disable */
import { storeToRefs } from 'pinia'

${storeNames.reduce(
  (str, storeName) => `${str}import ${storeName}Store from '${relativeStorePath}/${storeName}'
`,
  ''
)}

import store from '${relativeStorePath}'

export function useStore(storeName) {
  const storeExports = {
  ${storeNames.reduce(
    (str, storeName) => `${str}  ${storeName}: ${storeName}Store,
  `,
    ''
  )}}

  const targetStore = storeExports[storeName](store)
  const storeRefs = storeToRefs(targetStore)

  return { ...targetStore, ...storeRefs }
}
`

    // 生成 .d.ts 类型声明文件
    const dtsContent = `
import type { ToRef, UnwrapRef } from 'vue'
import type { StoreDefinition } from 'pinia'

${storeNames.reduce(
  (str, storeName) => `${str}import type ${storeName}Store from '${relativeStorePath}/${storeName}'
`,
  ''
)}

type StoreToRefs<T extends StoreDefinition> = {
  [K in keyof ReturnType<T>]: ReturnType<T>[K] extends (...args: unknown[]) => unknown
    ? ReturnType<T>[K]
    : ToRef<UnwrapRef<ReturnType<T>[K]>>
}

type StoreExports = {
${storeNames.reduce(
  (str, storeName) => `${str}  ${storeName}: typeof ${storeName}Store
`,
  ''
)}}

export function useStore<T extends keyof StoreExports>(
  storeName: T
): StoreToRefs<StoreExports[T]>
`
    await fs.writeFile(outputPath(), jsContent, 'utf-8')
    await fs.writeFile(outputDtsPath(), dtsContent, 'utf-8')
  }

  return {
    name: 'pinia-plugin-auto-store',
    configResolved(config) {
      root = config.root
      options.watch = options.watch ?? config.mode === 'development'
    },
    buildStart() {
      return generateConfigFiles()
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
        if (!file.startsWith(watchedRoot) || (!file.endsWith('.ts') && !file.endsWith('.js'))) {return}
        debounceGenerate()
      })
      server.watcher.on('unlink', (file: string) => {
        if (!file.startsWith(watchedRoot) || (!file.endsWith('.ts') && !file.endsWith('.js'))) {return}
        debounceGenerate()
      })
    },
  }
}
