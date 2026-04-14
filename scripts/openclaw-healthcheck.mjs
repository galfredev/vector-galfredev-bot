#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  currentIso,
  gatewayPort,
  logAudit,
  opsDir,
  readJson,
  runCommand,
  runOpenClawCommand,
  sendWhatsAppMessage,
  serviceName,
  stateDir,
  writeJson,
} from "./vector-improvement-lib.mjs";

const statePath = path.join(opsDir(), "openclaw-watchdog-state.json");

function short(text, max = 700) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readWatchdogState() {
  return readJson(statePath, {
    status: "unknown",
    issueSignature: "",
    consecutiveFailures: 0,
    lastAlertAt: null,
    lastRecoveryAt: null,
  });
}

function writeWatchdogState(next) {
  writeJson(statePath, next);
}

function serviceActive() {
  const result = runCommand("systemctl", ["is-active", serviceName()]);
  return {
    ok: (result.stdout || "").trim() === "active",
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function gatewayProbe() {
  const result = runOpenClawCommand(["gateway", "status"]);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    ok: result.status === 0 && /RPC probe:\s*ok/i.test(result.stdout || ""),
    output,
  };
}

function whatsappProbe() {
  const result = runOpenClawCommand(["channels", "status", "--probe"]);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const normalized = output.toLowerCase();
  const healthy =
    result.status === 0 &&
    normalized.includes("whatsapp default:") &&
    normalized.includes("enabled") &&
    normalized.includes("configured") &&
    normalized.includes("linked") &&
    normalized.includes("running") &&
    normalized.includes("connected");

  return {
    ok: healthy,
    output,
  };
}

function checkPersistedAllowFrom() {
  const allowFromPath = path.join(stateDir(), "credentials", "whatsapp-default-allowFrom.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(allowFromPath, "utf8").replace(/^\uFEFF/, ""));
    return Array.isArray(parsed.allowFrom) && parsed.allowFrom.includes("*");
  } catch {
    return true;
  }
}

function inspect() {
  const issues = [];
  const service = serviceActive();
  const gateway = gatewayProbe();
  const whatsapp = whatsappProbe();
  const allowFromOpen = checkPersistedAllowFrom();

  if (!service.ok) {
    issues.push(`Servicio ${serviceName()} inactivo.`);
  }

  if (!gateway.ok) {
    issues.push("Gateway RPC no responde sano.");
  }

  if (!whatsapp.ok) {
    issues.push("WhatsApp no esta running/connected.");
  }

  if (!allowFromOpen) {
    issues.push("El allowFrom persistido de WhatsApp sigue restringido.");
  }

  const combined = `${gateway.output}\n${whatsapp.output}`;
  if (/401|unauthorized|connection failure/i.test(combined)) {
    issues.push("Se detecto 401 o Connection Failure en WhatsApp.");
  }

  if (/1006 abnormal closure|gateway closed/i.test(combined)) {
    issues.push("Se detecto cierre anormal del gateway.");
  }

  return {
    issues,
    issueSignature: issues.join(" | "),
    service,
    gateway,
    whatsapp,
  };
}

function runRecover() {
  const scriptPath = path.join(path.dirname(new URL(import.meta.url).pathname), "openclaw-recover.mjs");
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function notifyOwner(message, event, extra = {}) {
  try {
    sendWhatsAppMessage(message);
    logAudit(event, { delivered: true, ...extra });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logAudit(`${event}_failed`, { delivered: false, error: details, ...extra });
  }
}

function degradedMessage(report, recoverResult) {
  const lines = [
    "Vector Infra",
    "",
    "Detecte un incidente operativo en OpenClaw.",
    "",
    `- Servicio: ${serviceName()}`,
    `- Puerto gateway: ${gatewayPort()}`,
    `- Gateway sano: ${report.gateway.ok ? "si" : "no"}`,
    `- WhatsApp sano: ${report.whatsapp.ok ? "si" : "no"}`,
    "",
    "Hallazgos:",
    ...report.issues.map((item) => `- ${item}`),
  ];

  if (recoverResult) {
    lines.push("", "Recuperacion automatica:", `- Resultado: ${recoverResult}`);
  }

  lines.push("", "Revisar: systemctl status, journalctl y openclaw channels status --probe");
  return lines.join("\n");
}

function recoveredMessage(previousIssues) {
  return [
    "Vector Infra",
    "",
    "Detecte una caida operativa y la recuperacion automatica salio bien.",
    "",
    `- Servicio: ${serviceName()}`,
    `- Gateway: ok`,
    `- WhatsApp: ok`,
    "",
    "Incidente detectado:",
    ...previousIssues.map((item) => `- ${item}`),
  ].join("\n");
}

function main() {
  if (process.platform === "win32") {
    console.error("openclaw-healthcheck.mjs esta pensado para Linux con systemd.");
    process.exitCode = 1;
    return;
  }

  const previous = readWatchdogState();
  const initial = inspect();

  if (initial.issues.length === 0) {
    if (previous.status !== "healthy") {
      notifyOwner(
        "Vector Infra\n\nEl health check volvio a estado sano.\n\n- Gateway: ok\n- WhatsApp: ok",
        "openclaw_watchdog.recovered_notice",
      );
    }

    writeWatchdogState({
      status: "healthy",
      issueSignature: "",
      consecutiveFailures: 0,
      lastAlertAt: previous.lastAlertAt || null,
      lastRecoveryAt: previous.lastRecoveryAt || null,
      checkedAt: currentIso(),
    });

    logAudit("openclaw_watchdog.healthy", {
      checkedAt: currentIso(),
      service: short(initial.service.stdout || initial.service.stderr),
    });
    return;
  }

  const recover = runRecover();
  const after = inspect();
  const recoverSummary = short(recover.stderr || recover.stdout || "Sin salida de recover.");

  if (after.issues.length === 0) {
    notifyOwner(
      recoveredMessage(initial.issues),
      "openclaw_watchdog.recovered",
      {
        recoverSummary,
      },
    );

    writeWatchdogState({
      status: "healthy",
      issueSignature: "",
      consecutiveFailures: 0,
      lastAlertAt: currentIso(),
      lastRecoveryAt: currentIso(),
      checkedAt: currentIso(),
    });

    logAudit("openclaw_watchdog.recovered", {
      recoverSummary,
      previousIssueSignature: initial.issueSignature,
    });
    return;
  }

  const shouldAlert =
    previous.status !== "degraded" || previous.issueSignature !== after.issueSignature;

  if (shouldAlert) {
    notifyOwner(
      degradedMessage(after, recoverSummary),
      "openclaw_watchdog.degraded",
      {
        issueSignature: after.issueSignature,
      },
    );
  }

  writeWatchdogState({
    status: "degraded",
    issueSignature: after.issueSignature,
    consecutiveFailures: Number(previous.consecutiveFailures || 0) + 1,
    lastAlertAt: shouldAlert ? currentIso() : previous.lastAlertAt || null,
    lastRecoveryAt: previous.lastRecoveryAt || null,
    checkedAt: currentIso(),
  });

  logAudit("openclaw_watchdog.degraded", {
    issueSignature: after.issueSignature,
    recoverSummary,
    gateway: short(after.gateway.output),
    whatsapp: short(after.whatsapp.output),
  });

  console.error(`OpenClaw watchdog detecto falla: ${after.issueSignature}`);
  process.exitCode = 1;
}

main();
