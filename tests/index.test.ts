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

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = join(tmpdir(), `pinia-plugin-test-${Date.now()}`)
    storeDir = join(testDir, 'src', 'store')
    outputFile = join(testDir, 'src', 'helper', 'use-store.js')

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

  it('should generate use-store.ts file with correct imports', async () => {
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

    // 创建插件实例
    const plugin = piniaAutoStore({
      storeDir: 'src/store',
      output: 'src/helper/use-store.js',
      exclude: '**/index.ts',
    })

    // 模拟 configResolved
    ;(plugin.configResolved as unknown as (config: MockResolvedConfig) => void)?.({
      root: testDir,
      mode: 'development',
    })

    // 执行 buildStart（现在是异步的）
    await (plugin.buildStart as unknown as (options: MockBuildStartOptions) => Promise<void>)?.({})

    // 验证文件已生成
    const content = await fs.readFile(outputFile, 'utf-8')

    expect(content).toContain('import userStore from')
    expect(content).toContain('import counterStore from')
    expect(content).toContain('export function useStore')
    expect(content).not.toContain('indexStore')
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
      output: 'src/helper/use-store.js',
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

  it('should handle absolute paths', async () => {
    await fs.writeFile(
      join(storeDir, 'user.ts'),
      `import { defineStore } from 'pinia'
export default defineStore('user', () => ({}))`
    )

    const plugin = piniaAutoStore({
      storeDir: resolve(testDir, 'src', 'store'),
      output: resolve(testDir, 'src', 'helper', 'use-store.js'),
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
      output: 'src/helper/use-store.js',
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
      output: 'src/helper/use-store.js',
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
      output: 'src/helper/use-store.js',
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
