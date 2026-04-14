#!/usr/bin/env node
import {
  currentIso,
  gatewayPort,
  logAudit,
  runCommand,
  runOpenClawCommand,
  serviceName,
  sleepMs,
} from "./vector-improvement-lib.mjs";

function ensureLinux() {
  if (process.platform === "win32") {
    throw new Error("openclaw-recover.mjs esta pensado para Linux con systemd.");
  }
}

function short(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 600);
}

function killPortListeners() {
  const port = gatewayPort();
  return runCommand("bash", [
    "-lc",
    `if command -v fuser >/dev/null 2>&1; then fuser -k ${port}/tcp || true; fi`,
  ]);
}

function gatewayHealthy() {
  const result = runOpenClawCommand(["gateway", "status"]);
  const stdout = result.stdout || "";
  return {
    ok: result.status === 0 && /RPC probe:\s*ok/i.test(stdout),
    stdout,
    stderr: result.stderr || "",
  };
}

function main() {
  ensureLinux();

  const service = serviceName();
  const stopResult = runCommand("systemctl", ["stop", service]);
  const killResult = killPortListeners();
  const startResult = runCommand("systemctl", ["start", service]);

  sleepMs(10000);
  const health = gatewayHealthy();

  logAudit("openclaw_watchdog.recover", {
    at: currentIso(),
    service,
    gatewayPort: gatewayPort(),
    stopStatus: stopResult.status,
    startStatus: startResult.status,
    killStatus: killResult.status,
    healthyAfterRestart: health.ok,
    gatewayStatus: short(health.stdout),
    gatewayError: short(health.stderr),
  });

  if (!health.ok) {
    const details = short(health.stderr || health.stdout || "Sin salida del gateway.");
    console.error(`OpenClaw recover fallo: ${details}`);
    process.exitCode = 1;
    return;
  }

  console.log("OpenClaw recover ok: gateway sano despues del restart.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
