import { spawn } from "node:child_process";

const commands = [
  { label: "api", command: "node", args: ["server/index.js"] },
  { label: "vite", command: "node", args: ["./node_modules/vite/bin/vite.js"] },
];

const children = commands.map((entry) => {
  const child = spawn(entry.command, entry.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
});

function closeAll() {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
}

process.on("SIGINT", closeAll);
process.on("SIGTERM", closeAll);
