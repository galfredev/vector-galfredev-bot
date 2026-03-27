#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  approverName,
  currentIso,
  ensureDir,
  extractSenderDigits,
  extractTextContent,
  extractUserBody,
  formatProposalMessage,
  listSessionFiles,
  logAudit,
  parseJsonl,
  parseTimestamp,
  pendingProposalFile,
  readJson,
  reportsDir,
  sendWhatsAppMessage,
  stateFile,
  writeJson,
} from "./vector-improvement-lib.mjs";

const state = readJson(stateFile(), {
  lastAnalyzedAt: 0,
  lastProposalAt: null,
});

const pending = readJson(pendingProposalFile(), null);
if (pending && pending.status === "pending") {
  logAudit("analysis.skipped_pending", { proposalId: pending.id });
  process.exit(0);
}

const audioFriction = [];
const attachmentFriction = [];

for (const filePath of listSessionFiles()) {
  const entries = parseJsonl(filePath);
  for (let i = 0; i < entries.length - 1; i += 1) {
    const current = entries[i];
    const next = entries[i + 1];
    if (current?.type !== "message" || next?.type !== "message") continue;
    if (current?.message?.role !== "user" || next?.message?.role !== "assistant") continue;

    const at = parseTimestamp(current.timestamp);
    if (at <= state.lastAnalyzedAt) continue;

    const userText = extractTextContent(current);
    const assistantText = extractTextContent(next);
    const senderDigits = extractSenderDigits(userText);
    const body = extractUserBody(userText);

    if (!body && !userText.includes("<media:audio>") && !userText.includes("[media attached:")) continue;

    if (
      userText.includes("<media:audio>") &&
      /no puedo escuchar|no pude transcribir|pasame por texto|mandame.*texto|no tengo reproducci[oó]n/i.test(assistantText)
    ) {
      audioFriction.push({
        session: path.basename(filePath),
        senderDigits,
        timestamp: current.timestamp,
        userBody: body || "<audio>",
        assistantText,
      });
    }

    if (
      /\[media attached:[^\]]+(image|pdf|document|application)/i.test(userText) &&
      /pasame por aca el mensaje|pasame por texto|reescrib|decime brevemente/i.test(assistantText)
    ) {
      attachmentFriction.push({
        session: path.basename(filePath),
        senderDigits,
        timestamp: current.timestamp,
        userBody: body || "<adjunto>",
        assistantText,
      });
    }
  }
}

const findings = [];
const summaryChanges = [];
const actions = [];

if (audioFriction.length > 0) {
  findings.push({
    kind: "audio_friction",
    summary: `Audios con friccion detectados: ${audioFriction.length} caso(s).`,
    evidence: audioFriction.slice(0, 3),
  });
  summaryChanges.push("reforzar el prompt para priorizar transcripcion y no pedir reescritura si el audio ya entra como contexto");
  summaryChanges.push("agregar memoria operativa para tratar audios como parte del lead");
  summaryChanges.push("registrar un caso de prueba de audio real para controlar regresiones");
  actions.push({
    type: "managed_block",
    target: "agents",
    slug: "audio-follow-up",
    title: "REGLA OPERATIVA APROBADA",
    body: [
      "- si entra un audio con contexto util, prioriza responder sobre ese contenido sin pedir que lo reescriban",
      "- solo pedi resumen corto si realmente no hubo transcripcion usable",
      "- usa la informacion del audio para calificar el lead y derivar cuando corresponda",
    ].join("\n"),
  });
  actions.push({
    type: "managed_block",
    target: "memory",
    slug: "audio-policy",
    title: "## Aprendizajes Automaticos Aprobados",
    body: [
      `- ${currentIso()}: Se detectaron ${audioFriction.length} caso(s) donde el bot pidio texto en lugar de aprovechar audio/transcripcion. Priorizar respuesta directa cuando el audio ya llega con contenido procesable.`,
    ].join("\n"),
  });
  actions.push({
    type: "append_test_case",
    slug: "audio-regression",
    title: "### Audio aprobado por supervision",
    body: [
      "- enviar un audio de WhatsApp explicando una necesidad real",
      "- esperar que el bot responda sobre el contenido sin pedir reescritura inmediata",
      "- validar que pueda derivar si del audio ya sale nombre + necesidad + contexto",
    ].join("\n"),
  });
}

if (attachmentFriction.length > 0) {
  findings.push({
    kind: "attachment_friction",
    summary: `Adjuntos con friccion detectados: ${attachmentFriction.length} caso(s).`,
    evidence: attachmentFriction.slice(0, 3),
  });
  summaryChanges.push("reforzar el uso de imagenes/documentos como contexto comercial sin pedir reescritura completa");
  actions.push({
    type: "managed_block",
    target: "agents",
    slug: "attachment-follow-up",
    title: "REGLA OPERATIVA APROBADA",
    body: [
      "- si una imagen o documento ya explica el problema, responde sobre eso y evita pedir que lo reescriban completo",
      "- usa una sola pregunta puntual cuando falte una pieza importante del contexto",
    ].join("\n"),
  });
  actions.push({
    type: "append_test_case",
    slug: "attachment-regression",
    title: "### Adjuntos aprobados por supervision",
    body: [
      "- enviar una captura o PDF que explique un proceso",
      "- validar que el bot use el adjunto como contexto sin pedir reescritura total",
    ].join("\n"),
  });
}

if (findings.length === 0) {
  writeJson(stateFile(), {
    ...state,
    lastAnalyzedAt: Date.now(),
  });
  logAudit("analysis.no_findings");
  process.exit(0);
}

const proposalId = `VEC-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12)}`;
const proposal = {
  id: proposalId,
  status: "pending",
  createdAt: currentIso(),
  sentAt: null,
  findings,
  summaryChanges,
  actions,
};

const reportPath = path.join(reportsDir(), `${proposalId}.md`);
ensureDir(reportsDir());
fs.writeFileSync(
  reportPath,
  [
    `# Vector Ops Reporte ${proposalId}`,
    "",
    `Destinatario: ${approverName()}`,
    `Creado: ${proposal.createdAt}`,
    "",
    "## Hallazgos",
    ...findings.flatMap((finding, index) => [
      `${index + 1}. ${finding.summary}`,
      ...finding.evidence.map(
        (item) =>
          `   - ${item.timestamp} | ${item.senderDigits || "sin numero"} | usuario: ${item.userBody} | bot: ${item.assistantText}`,
      ),
    ]),
    "",
    "## Cambios propuestos",
    ...summaryChanges.map((item) => `- ${item}`),
  ].join("\n"),
  "utf8",
);

sendWhatsAppMessage(formatProposalMessage(proposal));
proposal.sentAt = currentIso();
proposal.reportPath = reportPath;
writeJson(pendingProposalFile(), proposal);
writeJson(stateFile(), {
  ...state,
  lastAnalyzedAt: Date.now(),
  lastProposalAt: proposal.sentAt,
});
logAudit("analysis.proposal_sent", { proposalId });
