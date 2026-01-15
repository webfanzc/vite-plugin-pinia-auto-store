module.exports = {
  // 对 TypeScript 和 JavaScript 文件进行 lint 和类型检查
  '*.{ts,tsx}': [
    (filenames) => `oxlint --fix ${filenames.join(' ')}`,
    () => 'tsc --noEmit',
  ],
  '*.{js,mjs,cjs}': [
    (filenames) => `oxlint --fix ${filenames.join(' ')}`,
  ],
  // 当源码文件变更时运行测试
  'src/**/*.{ts,tsx}': () => 'pnpm test',
  // 当测试文件变更时也运行测试
  'tests/**/*.{ts,tsx}': () => 'pnpm test',
}
