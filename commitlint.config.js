/**
 * Conventional Commits, eng gefuehrt. Die Scopes sind die Pakete des
 * Workspace plus die Materialbereiche des Repositories; alles andere
 * weist der Hook ab, damit die Historie durchsuchbar bleibt.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 80],
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "core-rules",
        "holidays",
        "mcp-server",
        "shared-types",
        "web",
        "scripts",
        "slides",
        "trainer",
        "tooling",
        "repo",
      ],
    ],
  },
};
