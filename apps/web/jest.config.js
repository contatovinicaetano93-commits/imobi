module.exports = {
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  testMatch: ["**/__tests__/**/*.spec.ts", "**/lib/**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", {
      tsconfig: "./tsconfig.test.json",
    }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testEnvironment: "node",
};
