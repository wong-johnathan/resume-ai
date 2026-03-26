# Linting & Prettier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint (per-package flat configs) and a shared root Prettier config across client, server, and admin packages, with all lint violations resolved so `npm run lint` passes clean.

**Architecture:** Root `.prettierrc` shared by all packages. Each of `client/`, `server/`, and `admin/` gets its own `eslint.config.mjs` using ESLint 9 flat config format with `typescript-eslint`. Client and admin additionally include `eslint-plugin-react-hooks`. `eslint-config-prettier` is included last in every config to disable ESLint style rules that conflict with Prettier. Shared devDependencies are installed at the root (hoisted by npm workspaces). Root `package.json` gets `lint` and `format` scripts that delegate to all three packages. `landing/` is excluded from all scripts and Prettier.

**Note on `.mjs` extension:** The server's `package.json` has no `"type": "module"` (it's CommonJS), so ESLint would treat a plain `.js` config as CommonJS and fail to parse ES module syntax. Using `.mjs` forces Node to treat the config as an ES module regardless of the package type — this is required for the server config specifically.

**Tech Stack:** ESLint 9, typescript-eslint 8, eslint-plugin-react-hooks 5, eslint-config-prettier 9, Prettier 3, globals 15

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `.prettierrc` | Shared Prettier config |
| Create | `.prettierignore` | Ignore generated/vendored files |
| Create | `client/eslint.config.mjs` | ESLint config for React/TS client |
| Create | `server/eslint.config.mjs` | ESLint config for Node/TS server |
| Create | `admin/eslint.config.mjs` | ESLint config for React/TS admin |
| Modify | `package.json` | Add root lint/format scripts + shared devDeps |
| Modify | `client/package.json` | Add lint + format scripts |
| Modify | `server/package.json` | Add lint + format scripts |
| Modify | `admin/package.json` | Add lint + format scripts |

---

### Task 1: Install shared dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add devDependencies to root package.json**

Open `package.json` at the repo root and add these to `devDependencies`:

```json
"devDependencies": {
  "concurrently": "^8.2.2",
  "eslint": "^9.0.0",
  "typescript-eslint": "^8.0.0",
  "eslint-plugin-react-hooks": "^5.0.0",
  "eslint-config-prettier": "^9.0.0",
  "globals": "^15.0.0",
  "prettier": "^3.0.0"
}
```

- [ ] **Step 2: Install**

```bash
npm install
```

Expected: clean install, no errors.

---

### Task 2: Create root Prettier config

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 2: Create `.prettierignore`**

```
node_modules
dist
build
.next
out
landing
*.min.js
```

---

### Task 3: Create client ESLint config

**Files:**
- Create: `client/eslint.config.mjs`

- [ ] **Step 1: Create `client/eslint.config.mjs`**

```js
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended, eslintConfigPrettier],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
);
```

- [ ] **Step 2: Add lint scripts to `client/package.json`**

Add to the `scripts` section:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write src",
"format:check": "prettier --check src"
```

- [ ] **Step 3: Run lint (expect errors — that's OK for now)**

```bash
cd client && npx eslint .
```

Note the errors — they'll be fixed in Task 6.

---

### Task 4: Create server ESLint config

**Files:**
- Create: `server/eslint.config.mjs`

- [ ] **Step 1: Create `server/eslint.config.mjs`**

The `.mjs` extension is required here because `server/package.json` has no `"type": "module"`.

```js
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
);
```

- [ ] **Step 2: Add lint scripts to `server/package.json`**

Add to the `scripts` section:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write src",
"format:check": "prettier --check src"
```

- [ ] **Step 3: Run lint (expect errors — that's OK for now)**

```bash
cd server && npx eslint .
```

Note the errors.

---

### Task 5: Create admin ESLint config

**Files:**
- Create: `admin/eslint.config.mjs`

- [ ] **Step 1: Create `admin/eslint.config.mjs`**

Admin is also a React/TS Vite app — same config pattern as client:

```js
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended, eslintConfigPrettier],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
);
```

- [ ] **Step 2: Add lint scripts to `admin/package.json`**

Add to the `scripts` section:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write src",
"format:check": "prettier --check src"
```

- [ ] **Step 3: Run lint (expect errors — that's OK for now)**

```bash
cd admin && npx eslint .
```

---

### Task 6: Add root lint/format scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts to root `package.json`**

Add to the `scripts` section:

```json
"lint": "npm run lint --workspace=client && npm run lint --workspace=server && npm run lint --workspace=admin",
"lint:fix": "npm run lint:fix --workspace=client && npm run lint:fix --workspace=server && npm run lint:fix --workspace=admin",
"format": "prettier --write \"**/*.{ts,tsx,js,json,css,md}\" --ignore-path .prettierignore",
"format:check": "prettier --check \"**/*.{ts,tsx,js,json,css,md}\" --ignore-path .prettierignore"
```

---

### Task 7: Auto-fix and resolve lint violations

**Files:** Varies — source files in client/src, server/src, admin/src

- [ ] **Step 1: Run auto-fix across all packages**

```bash
npm run lint:fix
```

This resolves many issues automatically.

- [ ] **Step 2: Run lint to see remaining errors**

```bash
npm run lint
```

- [ ] **Step 3: Fix remaining errors manually**

Common patterns and how to handle them:

**Unused variables:**
```ts
// Prefix with _ to suppress, or remove if truly unused
const _unused = something;
```

**`@typescript-eslint/no-explicit-any` violations:**
These are `warn` — they won't block lint passing. No action needed.

**`react-hooks/exhaustive-deps` warnings:**
These are `warn` — won't block lint. If you want to suppress a specific instance:
```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**`@typescript-eslint/no-require-imports` in server:**
Convert to `import`, or add a targeted disable comment:
```ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const x = require('x');
```

- [ ] **Step 4: Verify lint passes clean**

```bash
npm run lint
```

Expected: exits with code 0, no errors (warnings are OK).

---

### Task 8: Commit

- [ ] **Step 1: Review source file changes from lint:fix**

```bash
git diff client/src server/src admin/src
```

- [ ] **Step 2: Stage config files and any fixed source files**

```bash
git add .prettierrc .prettierignore
git add client/eslint.config.mjs server/eslint.config.mjs admin/eslint.config.mjs
git add package.json client/package.json server/package.json admin/package.json
# Stage any source files that were auto-fixed:
git add client/src server/src admin/src
git commit -m "chore: add ESLint and Prettier configs across client, server, admin"
```
