module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Node by default; component tests opt in with a `@jest-environment jsdom` docblock.
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  // Functional tests need a running app + Postgres: `npm run test:functional`.
  // .claude/ holds Claude Code worktrees, whose copies of the tests must not run here.
  testPathIgnorePatterns: ['/node_modules/', '/tests/functional/', '/.claude/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
