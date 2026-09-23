module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Node by default; component tests opt in with a `@jest-environment jsdom` docblock.
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  // Functional tests need a running app + Postgres: `npm run test:functional`.
  testPathIgnorePatterns: ['/node_modules/', '/tests/functional/'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
