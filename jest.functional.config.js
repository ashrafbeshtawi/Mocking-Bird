// Runs against the stack from tests/functional/compose.yaml:
//   docker compose -f tests/functional/compose.yaml up -d --build --wait && npm run test:functional
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/tests/functional/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 60000,
};
