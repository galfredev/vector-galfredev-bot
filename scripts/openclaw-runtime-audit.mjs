#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  gatewayPort,
  openClawBin,
  opsDir,
  readJson,
  runCommand,
  serviceName,
  stateDir,
} from "./vector-improvement-lib.mjs";

function checkFile(filePath, label, failures, warnings) {
  if (!fs.existsSync(filePath)) {
    failures.push(`${label} no existe: ${filePath}`);
    return;
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    failures.push(`${label} no es legible: ${filePath}`);
  }
}

function main() {
  const failures = [];
  const warnings = [];
  const isWindows = process.platform === "win32";

  const runtimeRoot = stateDir();
  const configPath = path.join(runtimeRoot, "openclaw.json");
  const allowFromPath = path.join(runtimeRoot, "credentials", "whatsapp-default-allowFrom.json");

  checkFile(configPath, "Config principal", failures, warnings);
  if (!isWindows) {
    checkFile(openClawBin(), "Binario OpenClaw", failures, warnings);
  } else {
    warnings.push("El runtime audit esta orientado a Linux/systemd; algunos checks locales se omiten en Windows.");
  }

  const config = readJson(configPath, {});
  const allowFrom = readJson(allowFromPath, null);
  const serviceStatus = isWindows
    ? { stdout: "n/a", stderr: "" }
    : runCommand("systemctl", ["is-enabled", serviceName()]);

  if (config?.channels?.whatsapp?.enabled !== true) {
    failures.push("channels.whatsapp.enabled no esta en true.");
  }

  if (config?.channels?.whatsapp?.dmPolicy !== "open") {
    failures.push("channels.whatsapp.dmPolicy deberia ser open.");
  }

  if (String(config?.gateway?.port || "") !== String(gatewayPort())) {
    warnings.push(
      `gateway.port (${String(config?.gateway?.port || "missing")}) no coincide con VECTOR_GATEWAY_PORT (${gatewayPort()}).`,
    );
  }

  if (allowFrom && Array.isArray(allowFrom.allowFrom) && !allowFrom.allowFrom.includes("*")) {
    warnings.push("El allowFrom persistido de WhatsApp sigue restringido y puede bloquear chats nuevos.");
  }

  if (!isWindows && (serviceStatus.stdout || "").trim() !== "enabled") {
    warnings.push(`El servicio ${serviceName()} no esta habilitado con systemctl enable.`);
  }

  console.log(`Runtime root: ${runtimeRoot}`);
  console.log(`Ops dir: ${opsDir()}`);
  console.log(`Gateway port: ${gatewayPort()}`);
  console.log(`OpenClaw bin: ${openClawBin()}`);

  for (const warning of warnings) {
    console.warn(`warn: ${warning}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`fail: ${failure}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("ok: runtime audit sin fallas criticas.");
}

main();
