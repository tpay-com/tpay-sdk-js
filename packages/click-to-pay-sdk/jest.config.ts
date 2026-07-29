module.exports = {
  displayName: "@tpay-com/click-to-pay-sdk",
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  moduleFileExtensions: ["ts", "js"],
  coverageDirectory: "coverage/jest/coverage",
};
