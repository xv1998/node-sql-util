module.exports = {
  bail: true,
  verbose: true,
  cacheDirectory: './cache/jest/',
  globals: {
  },
  rootDir: './',
  testPathIgnorePatterns: ['node_modules/'],
  testRegex: '(/__tests__/.*\\.test)\\.(jsx?|tsx?|ts?)$',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'node'],
  moduleDirectories: ['node_modules'],
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/*.ts',
  ],
}
