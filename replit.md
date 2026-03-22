# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This project is an AI-powered PPTX presentation generation platform using DeepSeek AI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: DeepSeek API (via openai SDK) - `DEEPSEEK_API_KEY` env var
- **PPTX**: pptxgenjs for generating .pptx files
- **Frontend**: React + Vite + TailwindCSS + framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (PPT generation routes)
│   └── ppt-master/         # React + Vite frontend (AI PPT platform UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## AI PPT Platform Features

- **DeepSeek AI Integration**: Uses DeepSeek chat model for intelligent content generation
- **Agent Skills**: Multi-step AI pipeline that plans outline then enriches each slide's content
- **PPTX Generation**: pptxgenjs builds professional .pptx files with themed layouts
- **Async Processing**: Job-based architecture with polling for real-time progress updates
- **4 Visual Themes**: Professional (navy), Creative (dark), Minimal (white), Academic (green)
- **Multi-language**: Chinese (default) and English support
- **History**: PostgreSQL stores all generation jobs for history access

## Key Routes

- `POST /api/ppt/generate` — Start a PPT generation job
- `GET /api/ppt/status/:jobId` — Poll job status and progress
- `GET /api/ppt/download/:jobId` — Download the generated .pptx file
- `GET /api/ppt/history` — List all past generations

## Database Schema

- `ppt_jobs` table: stores all generation jobs with topic, status, progress, outline JSON, file path

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/ppt.ts` handle PPT generation.
Key files:
- `src/lib/deepseek.ts` — DeepSeek AI client, outline planning, content enrichment
- `src/lib/pptx-builder.ts` — pptxgenjs PPTX file builder with 4 themes

### `artifacts/ppt-master` (`@workspace/ppt-master`)

React + Vite frontend at `/` (root path).

### `lib/db` (`@workspace/db`)

Database layer. Schema in `src/schema/ppt-jobs.ts`.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI spec at `openapi.yaml`. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
