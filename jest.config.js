module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/__mocks__/'],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__tests__/__mocks__/svgMock.js',
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
  },
};
