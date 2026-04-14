import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

export function normalizeDigits(value = "") {
  return String(value).replace(/\D+/g, "");
}

export function normalizeCommandText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function homeDir() {
  return env("VECTOR_HOME") || env("HOME") || env("USERPROFILE") || "";
}

export function stateDir() {
  return env("VECTOR_STATE_DIR") || path.join(homeDir(), ".openclaw");
}

export function opsDir() {
  return env("VECTOR_OPS_DIR") || path.join(stateDir(), "ops");
}

export function workspaceDir() {
  return env("VECTOR_WORKSPACE_DIR") || path.join(stateDir(), "workspace");
}

export function repoDir() {
  return env("VECTOR_REPO_DIR") || path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

export function sessionsDir() {
  return path.join(stateDir(), "agents", "main", "sessions");
}

export function reportsDir() {
  return path.join(opsDir(), "reports");
}

export function auditFile() {
  return path.join(opsDir(), "audit.jsonl");
}

export function stateFile() {
  return path.join(opsDir(), "improvement-state.json");
}

export function pendingProposalFile() {
  return path.join(opsDir(), "pending-proposal.json");
}

export function testCasesFile() {
  return path.join(opsDir(), "test-cases.md");
}

export function approverNumber() {
  return env("VECTOR_APPROVER_NUMBER", "+5493571606142");
}

export function approverName() {
  return env("VECTOR_APPROVER_NAME", "Valentino");
}

export function openClawUser() {
  return env("VECTOR_OPENCLAW_USER", "openclaw");
}

export function openClawBin() {
  return env("VECTOR_OPENCLAW_BIN") || path.join(homeDir(), ".local", "bin", "openclaw");
}

export function serviceName() {
  return env("VECTOR_SERVICE_NAME", "openclaw-galfre.service");
}

export function gatewayPort() {
  return env("VECTOR_GATEWAY_PORT", "18789");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function logAudit(event, extra = {}) {
  appendJsonl(auditFile(), {
    ts: new Date().toISOString(),
    event,
    ...extra,
  });
}

export function listSessionFiles() {
  try {
    return fs
      .readdirSync(sessionsDir())
      .filter((name) => name.endsWith(".jsonl") && !name.includes(".reset."))
      .map((name) => path.join(sessionsDir(), name))
      .sort();
  } catch {
    return [];
  }
}

export function parseJsonl(filePath) {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function parseTimestamp(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function extractTextContent(entry) {
  const blocks = entry?.message?.content;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((block) => (block?.type === "text" ? String(block.text || "") : ""))
    .join("\n")
    .trim();
}

export function extractSenderDigits(text) {
  const senderMatch = text.match(/"sender_id":\s*"([^"]+)"/);
  return normalizeDigits(senderMatch?.[1] || "");
}

export function extractUserBody(text) {
  return String(text)
    .replace(/\[media attached:[^\]]+\]\n?/gi, "")
    .replace(/To send an image back[\s\S]*?Keep caption in the text body\.\n?/gi, "")
    .replace(/Conversation info \(untrusted metadata\):\n```json[\s\S]*?```\n?/gi, "")
    .replace(/Sender \(untrusted metadata\):\n```json[\s\S]*?```\n?/gi, "")
    .replace(/Replied message \(untrusted, for context\):\n```json[\s\S]*?```\n?/gi, "")
    .replace(/<media:[^>]+>/gi, "")
    .trim();
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

export function runOpenClawCommand(args, options = {}) {
  const bin = openClawBin();
  if (process.platform === "win32") {
    return runCommand(bin, args, options);
  }

  return runCommand("sudo", ["-u", openClawUser(), "-H", bin, ...args], options);
}

export function sendWhatsAppMessage(message) {
  const target = approverNumber();
  const user = openClawUser();
  const bin = openClawBin();
  const command = process.platform === "win32" ? bin : "sudo";
  const args =
    process.platform === "win32"
      ? ["message", "send", "--channel", "whatsapp", "--target", target, "--message", message]
      : ["-u", user, "-H", bin, "message", "send", "--channel", "whatsapp", "--target", target, "--message", message];
  const result = runCommand(command, args);

  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to send WhatsApp message to ${target}`);
  }

  return result.stdout.trim();
}

export function restartService() {
  if (process.platform === "win32") return;

  const result = runCommand("systemctl", ["restart", serviceName()]);
  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to restart ${serviceName()}`);
  }
}

export function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function formatProposalMessage(proposal) {
  const lines = [
    "Vector Ops",
    "",
    `Reporte de mejora para ${approverName()}.`,
    `ID: ${proposal.id}`,
    "",
    "Hallazgos:",
    ...proposal.findings.map((finding, index) => `${index + 1}. ${finding.summary}`),
    "",
    "Cambios propuestos:",
    ...proposal.summaryChanges.map((item) => `- ${item}`),
    "",
    "Para aplicarlos, responde con cualquiera de estas opciones:",
    "APROBAR",
    "\u{1F44D}",
    "\u2705",
    "",
    "Para descartarlos, responde con cualquiera de estas opciones:",
    "RECHAZAR",
    "\u274C",
    "\u2716\uFE0F",
  ];

  return lines.join("\n");
}

export function ensureManagedBlock(filePath, slug, title, body) {
  const start = `<!-- vector-ops:${slug}:start -->`;
  const end = `<!-- vector-ops:${slug}:end -->`;
  const block = `${start}\n${title}\n${body.trim()}\n${end}`;
  let current = "";

  try {
    current = fs.readFileSync(filePath, "utf8");
  } catch {
    current = "";
  }

  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, "g");
  const next = pattern.test(current)
    ? current.replace(pattern, block)
    : `${current.trimEnd()}\n\n${block}\n`;

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, next, "utf8");
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function currentIso() {
  return new Date().toISOString();
}
