import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { ResolvedConfig } from 'vite'
import piniaAutoStore from '../src/index'

// Mock types for plugin hooks
type MockResolvedConfig = Pick<ResolvedConfig, 'root' | 'mode'>
type MockBuildStartOptions = Record<string, never>

describe('pinia-plugin-auto-store', () => {
  let testDir: string
  let storeDir: string
  let outputFile: string
  let outputDtsFile: string

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = join(tmpdir(), `pinia-plugin-test-${Date.now()}`)
    storeDir = join(testDir, 'src', 'store')
    outputFile = join(testDir, 'src', 'helper', 'use-store.ts')
    outputDtsFile = join(testDir, 'src', 'helper', 'use-store.d.ts')

    await fs.mkdir(storeDir, { recursive: true })
    await fs.mkdir(join(testDir, 'src', 'helper'), { recursive: true })
  })

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  it('should generate use-store.ts file with correct imports (default TypeScript mode)', async () => {
    // 创建测试 store 文件
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({ name: 'test' }))`
    )

    await fs.writeFile(
      join(storeDir, 'counter.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('counter', () => ({ count: 0 }))`
    )

    await fs.writeFile(
      join(storeDir, 'index.ts'),
      `import { createPinia } from 'pinia'
export default createPinia()`
    )

    // 创建插件实例（默认使用 TypeScript）
    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
      exclude: '**/index.ts',
    })

    // 模拟 configResolved
    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    // 执行 buildStart（现在是异步的）
    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 验证 TypeScript 文件已生成
    const content = await fs.readFile(outputFile, 'utf-8')

    expect(content).toContain('import userStore from')
    expect(content).toContain('import counterStore from')
    expect(content).toContain('typeof userStore')
    expect(content).toContain('typeof counterStore')
    expect(content).toContain('export function useStore')
    expect(content).toContain('StoreToRefs')
    expect(content).toContain('StoreExports')
    expect(content).not.toContain('indexStore')

    // 验证没有生成 .d.ts 文件
    await expect(fs.access(outputDtsFile)).rejects.toThrow()
  })

  it('should exclude files matching exclude pattern', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({}))`
    )

    await fs.writeFile(
      join(storeDir, 'helpers.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('helpers', () => ({}))`
    )

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
      exclude: ['**/index.ts', '**/helpers.ts'],
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    const content = await fs.readFile(outputFile, 'utf-8')

    expect(content).toContain('userStore')
    expect(content).not.toContain('helpersStore')
  })

  it('should generate .js and .d.ts files when outputType is js', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({ name: 'test' }))`
    )

    const jsOutputFile = join(testDir, 'src', 'helper', 'use-store.js')
    const dtsOutputFile = join(testDir, 'src', 'helper', 'use-store.d.ts')

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.js',
      outputType: 'js',
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 验证 JS 文件已生成
    const jsContent = await fs.readFile(jsOutputFile, 'utf-8')
    expect(jsContent).toContain('import userStore from')
    expect(jsContent).toContain('export function useStore(storeName)')
    expect(jsContent).not.toContain('type')

    // 验证 DTS 文件已生成
    const dtsContent = await fs.readFile(dtsOutputFile, 'utf-8')
    expect(dtsContent).toContain('import type userStore from')
    expect(dtsContent).toContain('export function useStore')
    expect(dtsContent).toContain('StoreToRefs')
  })

  it('should auto-detect outputType from output path extension', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({ name: 'test' }))`
    )

    // 测试 .js 扩展名自动检测为 js 模式
    const jsOutputFile = join(testDir, 'src', 'helper', 'use-store.js')
    const dtsOutputFile = join(testDir, 'src', 'helper', 'use-store.d.ts')

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.js', // 没有显式指定 outputType
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 应该生成 .js 和 .d.ts 文件
    await expect(fs.access(jsOutputFile)).resolves.not.toThrow()
    await expect(fs.access(dtsOutputFile)).resolves.not.toThrow()

    // 测试 .ts 扩展名自动检测为 ts 模式
    const tsOutputFile = join(testDir, 'src', 'helper', 'use-store-ts.ts')

    const plugin2 = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store-ts.ts', // 没有显式指定 outputType
    })

    ;(plugin2.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin2.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 应该只生成 .ts 文件
    await expect(fs.access(tsOutputFile)).resolves.not.toThrow()
    const tsContent = await fs.readFile(tsOutputFile, 'utf-8')
    expect(tsContent).toContain('import userStore from')
    expect(tsContent).toContain('typeof userStore')
    expect(tsContent).toContain('export function useStore')
  })

  it('should respect explicit outputType option', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({ name: 'test' }))`
    )

    // 显式指定 outputType: 'ts'，即使 output 是 .js
    const tsOutputFile = join(testDir, 'src', 'helper', 'use-store.ts')

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.js',
      outputType: 'ts', // 显式指定
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 应该生成 .ts 文件（根据 outputType，不是 output 路径）
    await expect(fs.access(tsOutputFile)).resolves.not.toThrow()
    const content = await fs.readFile(tsOutputFile, 'utf-8')
    expect(content).toContain('import userStore from')
    expect(content).toContain('typeof userStore')
    expect(content).toContain('export function useStore')
  })

  it('should handle absolute paths', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({}))`
    )

    const plugin = piniaAutoStore({
      storeDir: resolve(testDir, 'src', 'store'),
      output: resolve(testDir, 'src', 'helper', 'use-store.ts'),
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    const content = await fs.readFile(outputFile, 'utf-8')
    expect(content).toContain('useStore')
  })

  it('should generate correct relative paths', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({}))`
    )

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    const content = await fs.readFile(outputFile, 'utf-8')
    // 应该使用相对路径导入
    expect(content).toMatch(/from ['"]\.\.\/store\/user['"]/)
  })

  it('should support .js store files', async () => {
    await fs.writeFile(
      join(storeDir, 'user.js'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({ name: 'test' }))`
    )

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    const content = await fs.readFile(outputFile, 'utf-8')
    expect(content).toContain('import userStore from')
    expect(content).toContain('useStore')
  })

  it('should respect include option', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({}))`
    )

    await fs.writeFile(
      join(storeDir, 'helper.js'),
      `// helper file`
    )

    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.ts',
      include: '**/*.ts', // 只包含 .ts 文件
    })

    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    const content = await fs.readFile(outputFile, 'utf-8')
    expect(content).toContain('userStore')
    expect(content).not.toContain('helper')
  })
})
