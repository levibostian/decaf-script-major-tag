# decaf Script - Major Tag

A script specifically designed for the [decaf](https://github.com/levibostian/decaf) deployment automation tool. This script keeps a major Git tag (e.g. `v2`) pointing to the latest release commit — a common practice so that consumers can always pin to a major version without having to update their references on every release.

> [!NOTE]  
> This is exclusively for use with decaf. You must use decaf to utilize this script — it's not a standalone tool for general use.

## What does this script do?

It is a common practice to maintain a floating major-version tag (e.g. `v2`) that always points to the latest release within that major version. Consumers can then reference a major version and automatically receive all updates within it, without needing to update their references on every patch or minor release.

This script automates that maintenance step. On each deployment it:

1. Reads the next version name supplied by decaf (e.g. `2.4.1`).
2. Parses the major version out of it (e.g. `2`).
3. Builds the major tag name — the prefix defaults to empty (e.g. `2`), but can be set to anything (e.g. `--tag-prefix v` gives `v2`).
4. Force-creates or updates that tag to point at the target commit (defaults to `HEAD`, or a custom SHA you provide).
5. Force-pushes the tag to `origin`.

No commands, no subcommands — just run the script as a decaf `deploy` step.

## Getting Started

**Example**

```yaml
- uses: levibostian/decaf
  with:
    deploy: |
      # ... your other deploy steps ...
      deno run --allow-all --quiet jsr:@levibostian/decaf-script-major-tag
      # ... any remaining deploy steps, including updating single-source-of-truth ...
```

If you need to tag a specific commit SHA (e.g. the HEAD of a release branch produced by another script):

```yaml
deploy: |
  deno run --allow-all --quiet jsr:@levibostian/decaf-script-major-tag --commit-sha {{ commitSha }}
```

### Alternative Installation Methods

The examples above use `deno run` via JSR. You can also run the script via `npx` or as a compiled binary.

**Run with npx** (requires Node.js):

```yaml
deploy: npx @levibostian/decaf-script-major-tag
```

**Run as a compiled binary**:

```yaml
deploy: |
  curl -fsSL https://github.com/levibostian/decaf-script-major-tag/blob/HEAD/install?raw=true | bash -s "0.1.0"
  ./decaf-script-major-tag
```

## Options

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--tag-prefix` | No | `""` (empty) | Prefix for the major tag. Set to `v` for the common `v{major}` format (e.g. `v2`). |
| `--commit-sha` | No | `HEAD` | The commit SHA to tag. Defaults to the latest commit on the current branch. |

## Examples

```bash
# Default: tags HEAD as {major} (e.g. 2 for version 2.4.1)
deno run --allow-all script.ts

# Add a "v" prefix (e.g. v2)
deno run --allow-all script.ts --tag-prefix v

# Custom prefix
deno run --allow-all script.ts --tag-prefix release-

# Tag a specific commit
deno run --allow-all script.ts --commit-sha abc1234

# Custom prefix + specific commit
deno run --allow-all script.ts --tag-prefix v --commit-sha abc1234
```
