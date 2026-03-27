#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  approverNumber,
  currentIso,
  extractSenderDigits,
  extractTextContent,
  extractUserBody,
  listSessionFiles,
  logAudit,
  normalizeCommandText,
  parseJsonl,
  parseTimestamp,
  pendingProposalFile,
  readJson,
  sendWhatsAppMessage,
  writeJson,
} from "./vector-improvement-lib.mjs";

const pending = readJson(pendingProposalFile(), null);
if (!pending || pending.status !== "pending") {
  process.exit(0);
}

const sentAt = parseTimestamp(pending.sentAt || pending.createdAt);
const approverDigits = approverNumber().replace(/\D+/g, "");

let approvalBody = "";
for (const filePath of listSessionFiles()) {
  const entries = parseJsonl(filePath);
  for (const entry of entries) {
    if (entry?.type !== "message" || entry?.message?.role !== "user") continue;

    const at = parseTimestamp(entry.timestamp);
    if (at <= sentAt) continue;

    const text = extractTextContent(entry);
    if (extractSenderDigits(text) !== approverDigits) continue;

    const body = extractUserBody(text);
    if (!body) continue;

    approvalBody = body.trim();
  }
}

if (!approvalBody) {
  process.exit(0);
}

const normalizedBody = normalizeCommandText(approvalBody);
const proposalId = pending.id.toUpperCase();
const matchesId = normalizedBody.includes(proposalId);
const approves =
  normalizedBody === "SI" ||
  normalizedBody === "APROBAR" ||
  normalizedBody === "APLICAR" ||
  normalizedBody === "APLICAR PROPUESTA" ||
  normalizedBody === "REALIZAR" ||
  normalizedBody === "REALIZAR PROPUESTA" ||
  normalizedBody === "SI REALIZAR" ||
  normalizedBody === "SI REALIZAR PROPUESTA" ||
  normalizedBody === "SI APLICAR" ||
  normalizedBody === "SI APLICAR PROPUESTA" ||
  approvalBody.trim() === "\u{1F44D}" ||
  approvalBody.trim() === "\u2705" ||
  normalizedBody === `APROBAR ${proposalId}` ||
  normalizedBody === `APLICAR ${proposalId}` ||
  normalizedBody === `REALIZAR ${proposalId}`;
const rejects =
  normalizedBody === "RECHAZAR" ||
  normalizedBody === "NO APROBAR" ||
  normalizedBody === "CANCELAR" ||
  normalizedBody === "NO APLICAR" ||
  normalizedBody === "NO APLICAR PROPUESTA" ||
  approvalBody.trim() === "\u274C" ||
  approvalBody.trim() === "\u2716" ||
  approvalBody.trim() === "\u2716\uFE0F" ||
  normalizedBody === `RECHAZAR ${proposalId}` ||
  normalizedBody === `CANCELAR ${proposalId}`;

if (rejects && (!approves || matchesId)) {
  pending.status = "rejected";
  pending.rejectedAt = currentIso();
  pending.rejectedByMessage = approvalBody;
  writeJson(pendingProposalFile(), pending);
  sendWhatsAppMessage(`Vector Ops\n\nPropuesta ${pending.id} descartada. No aplique cambios.`);
  logAudit("proposal.rejected", { proposalId: pending.id, body: approvalBody });
  process.exit(0);
}

if (!approves) {
  process.exit(0);
}

if (!matchesId && normalizedBody.startsWith("APROBAR ")) {
  process.exit(0);
}

const scriptPath = path.join(path.dirname(new URL(import.meta.url).pathname), "vector-improvement-apply.mjs");
const result = spawnSync(process.execPath, [scriptPath, pendingProposalFile()], {
  encoding: "utf8",
  stdio: "pipe",
});

if (result.status !== 0) {
  sendWhatsAppMessage(
    `Vector Ops\n\nIntente aplicar la propuesta ${pending.id}, pero hubo un error.\n\n${(result.stderr || result.stdout || "Sin detalle").slice(0, 1200)}`,
  );
  logAudit("proposal.apply_failed", { proposalId: pending.id, stderr: result.stderr, stdout: result.stdout });
  process.exit(result.status ?? 1);
}

sendWhatsAppMessage(`Vector Ops\n\nPropuesta ${pending.id} aplicada correctamente. Ya actualice las reglas y reinicie el bot.`);
logAudit("proposal.approved", { proposalId: pending.id, body: approvalBody });
