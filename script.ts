import { getDeployStepInput } from "@levibostian/decaf-sdk";
import { parseArgs } from "@std/cli/parse-args";
import { parse as parseSemver } from "@std/semver";
import $ from "@david/dax";

// ============================================================================
// updateMajorTag
//
// Parses the major version out of nextVersionName (provided by the decaf SDK),
// builds the major tag name (e.g. "v2"), force-creates or updates that tag at
// the given commit SHA (defaulting to HEAD), then pushes the tag to origin.
// ============================================================================

export const updateMajorTag = async ({
  tagPrefix = "v",
  commitSha,
}: {
  tagPrefix?: string;
  commitSha?: string;
}): Promise<{ tagName: string; commitSha: string }> => {
  const input = getDeployStepInput();

  const semver = parseSemver(input.nextVersionName);
  const majorVersion = semver.major;
  const tagName = `${tagPrefix}${majorVersion}`;

  const resolvedCommitSha = commitSha
    ? commitSha
    : (await $`git rev-parse HEAD`.text()).trim();

  console.log(`Updating major tag '${tagName}' to point to commit ${resolvedCommitSha}`);

  await $`git tag -f ${tagName} ${resolvedCommitSha}`.printCommand();

  if (input.testMode) {
    console.log("Test mode is enabled — skipping git push.");
  } else {
    await $`git push origin ${tagName} --force`.printCommand();
  }

  console.log(`Major tag updated: ${tagName} → ${resolvedCommitSha}`);

  return { tagName, commitSha: resolvedCommitSha };
};

// ============================================================================
// CLI
// ============================================================================

function showHelp() {
  console.log(`
Usage:
  script.ts [--tag-prefix <prefix>] [--commit-sha <sha>]

Options:
  --tag-prefix <prefix>   Prefix for the major tag. Example, "v" will produce "v2"
  --commit-sha <sha>      The commit SHA to tag. Defaults to HEAD of the current branch.

Examples:
  script.ts
  script.ts --tag-prefix v
  script.ts --commit-sha abc1234
  script.ts --tag-prefix v --commit-sha abc1234
`);
}

if (import.meta.main) {
  const parsedArgs = parseArgs(Deno.args, {
    boolean: ["help"],
    string: ["tag-prefix", "commit-sha"],
    alias: { h: "help" },
    default: { "tag-prefix": "" },
  });

  if (parsedArgs.help) {
    showHelp();
    Deno.exit(0);
  }

  const tagPrefix = parsedArgs["tag-prefix"] as string;
  const commitSha = parsedArgs["commit-sha"] as string | undefined;

  await updateMajorTag({ tagPrefix, commitSha });
}
