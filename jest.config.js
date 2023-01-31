const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    roots: ["./"],
    modulePaths: [compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    clearMocks: true,
};
