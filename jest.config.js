/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    [String.raw`^.+\.(t|j)s$`]: ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/generated/**'],
  coverageDirectory: './coverage',
};
