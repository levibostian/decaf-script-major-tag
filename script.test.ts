import type { DeployStepInput } from "@levibostian/decaf-sdk";
import { runDeployScript } from "@levibostian/decaf-sdk/testing";
import { mockBin, type MockBinCleanup } from "@levibostian/mock-a-bin";
import { assertEquals } from "@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------

// Mock git so tests don't need a real repository.
// Every invocation is appended to logFile as "git <args>" so tests can assert
// on the exact ordered list of commands that were run.
async function mockGit(
  headSha: string,
  logFile: string,
): Promise<{ cleanup: MockBinCleanup; readCommands: () => string[] }> {
  const cleanup = await mockBin(
    "git",
    "bash",
    `
# Record the full invocation as "git <arg1> <arg2> ..." on a single line
echo "git $*" >> "${logFile}"

case "$1" in
  rev-parse)
    echo "${headSha}"
    ;;
esac
`,
  );

  const readCommands = (): string[] => {
    try {
      const text = Deno.readTextFileSync(logFile);
      return text.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  };

  return { cleanup, readCommands };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("updates major tag with default empty prefix, resolves HEAD sha", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("abc1234567890def", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "2.4.1",
      testMode: true,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      "deno run --allow-all script.ts",
      input,
    );

    assertEquals(code, 0);
    assertEquals(readCommands(), [
      "git rev-parse HEAD",
      "git tag -f 2 abc1234567890def",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});

Deno.test("updates major tag with custom --tag-prefix", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("deadbeef11223344", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "3.0.0",
      testMode: true,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      "deno run --allow-all script.ts --tag-prefix release-",
      input,
    );

    assertEquals(code, 0);
    assertEquals(readCommands(), [
      "git rev-parse HEAD",
      "git tag -f release-3 deadbeef11223344",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});

Deno.test("updates major tag with v --tag-prefix", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("00112233aabbccdd", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "5.1.0",
      testMode: true,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      `deno run --allow-all script.ts --tag-prefix v`,
      input,
    );

    assertEquals(code, 0);
    assertEquals(readCommands(), [
      "git rev-parse HEAD",
      "git tag -f v5 00112233aabbccdd",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});

Deno.test("uses provided --commit-sha instead of HEAD", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("this-sha-should-not-be-used", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "1.0.0",
      testMode: true,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      "deno run --allow-all script.ts --commit-sha custom99sha",
      input,
    );

    assertEquals(code, 0);
    // rev-parse should NOT have been called since we provided --commit-sha
    assertEquals(readCommands(), [
      "git tag -f 1 custom99sha",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});

Deno.test("pushes tag to origin when testMode is false", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("ff00ee11dd22cc33", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "4.2.0",
      testMode: false,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      "deno run --allow-all script.ts",
      input,
    );

    assertEquals(code, 0);
    assertEquals(readCommands(), [
      "git rev-parse HEAD",
      "git tag -f 4 ff00ee11dd22cc33",
      "git push origin 4 --force",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});

Deno.test("correctly extracts major version from patch release (e.g. 2.4.1 → 2)", async (t) => {
  const logFile = await Deno.makeTempFile();
  const { cleanup, readCommands } = await mockGit("patchsha111", logFile);
  try {
    const input: DeployStepInput = {
      gitCurrentBranch: "main",
      nextVersionName: "2.4.1",
      testMode: true,
    } as unknown as DeployStepInput;

    const { code, stdout } = await runDeployScript(
      "deno run --allow-all script.ts",
      input,
    );

    assertEquals(code, 0);
    assertEquals(readCommands(), [
      "git rev-parse HEAD",
      "git tag -f 2 patchsha111",
    ]);
    await assertSnapshot(t, stdout.join("\n"));
  } finally {
    cleanup();
  }
});
