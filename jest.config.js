/**
 * Ein Jest-Projekt je Paket. Die Transformation laeuft ueber ts-jest mit
 * vollstaendiger Typpruefung, damit die Tests dieselben Fehler sehen wie der
 * Compiler.
 */
const tsJestTransform = [
  "ts-jest",
  {
    tsconfig: {
      module: "CommonJS",
      moduleResolution: "Node10",
      verbatimModuleSyntax: false,
    },
  },
];

const moduleNameMapper = {
  "^@urlaub/(.*)$": "<rootDir>/../$1/src/index.ts",
  "^(\\.{1,2}/.*)\\.js$": "$1",
};

function project(name, environment) {
  return {
    displayName: name,
    rootDir: `packages/${name}`,
    testEnvironment: environment,
    testMatch: ["<rootDir>/test/**/*.test.ts", "<rootDir>/test/**/*.test.tsx"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    transform: { "^.+\\.(ts|tsx)$": tsJestTransform },
    moduleNameMapper,
  };
}

export default {
  verbose: true,
  projects: [
    project("holidays", "node"),
    project("core-rules", "node"),
    project("shared-types", "node"),
    project("api", "node"),
    project("web", "jsdom"),
  ],
};
