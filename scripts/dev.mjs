import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.resolve(process.cwd(), ".env"));

const services = [
  {
    name: "web",
    cwd: "artifacts/ppt-master",
    command: "pnpm",
    args: ["run", "dev"],
    env: {
      PORT: process.env.PORT || "4173",
      BASE_PATH: process.env.BASE_PATH || "/",
    },
  },
  {
    name: "api",
    cwd: "artifacts/api-server",
    command: "pnpm",
    args: ["run", "dev"],
    env: {
      PORT: process.env.API_PORT || "3001",
      NODE_ENV: "development",
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "placeholder",
    },
  },
];

const children = [];
let shuttingDown = false;

function startService(service) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: {
      ...process.env,
      ...service.env,
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`[${service.name}] failed to start`, error);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${service.name}] exited with ${reason}`);
    shutdown(typeof code === "number" ? code : 1);
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

for (const service of services) {
  startService(service);
}
