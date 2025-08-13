module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$)' // keep the default, but add any ES-only deps
  ],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1', // adjust to your tsconfig paths
  },
};
