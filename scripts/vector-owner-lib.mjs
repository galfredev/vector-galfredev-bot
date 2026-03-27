import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  approverName,
  approverNumber,
  currentIso,
  extractSenderDigits,
  extractTextContent,
  extractUserBody,
  listSessionFiles,
  normalizeCommandText,
  normalizeDigits,
  openClawBin,
  openClawUser,
  opsDir,
  parseJsonl,
  parseTimestamp,
  pendingProposalFile,
  readJson,
  runCommand,
  sendWhatsAppMessage,
  stateDir,
  writeJson,
} from "./vector-improvement-lib.mjs";

export function ownerSettingsFile() {
  return path.join(opsDir(), "owner-settings.json");
}

export function ownerControlStateFile() {
  return path.join(opsDir(), "owner-control-state.json");
}

export function ownerBriefStateFile() {
  return path.join(opsDir(), "owner-brief-state.json");
}

export function defaultOwnerSettings() {
  const minHours = Number.parseInt(process.env.VECTOR_OWNER_BRIEF_MIN_HOURS || "72", 10);
  return {
    audioBriefsEnabled: (process.env.VECTOR_OWNER_BRIEF_AUDIO_DEFAULT || "true").toLowerCase() === "true",
    minHours: Number.isFinite(minHours) && minHours > 0 ? minHours : 72,
    lastAutoBriefAt: null,
    lastManualBriefAt: null,
  };
}

export function readOwnerSettings() {
  return {
    ...defaultOwnerSettings(),
    ...readJson(ownerSettingsFile(), {}),
  };
}

export function writeOwnerSettings(settings) {
  writeJson(ownerSettingsFile(), settings);
}

export function readOwnerControlState() {
  return readJson(ownerControlStateFile(), { lastProcessedAt: 0 });
}

export function writeOwnerControlState(state) {
  writeJson(ownerControlStateFile(), state);
}

export function readOwnerBriefState() {
  return readJson(ownerBriefStateFile(), { lastGeneratedAt: 0 });
}

export function writeOwnerBriefState(state) {
  writeJson(ownerBriefStateFile(), state);
}

export function ownerCommandHelp() {
  return [
    "Vector Owner",
    "",
    "Comandos disponibles:",
    "BRIEF",
    "ESTADO",
    "PROPUESTAS",
    "AUDIO ON",
    "AUDIO OFF",
    "TEST AUDIO",
    "AYUDA",
    "",
    "Para propuestas de mejora tambien podes responder:",
    "APROBAR",
    "RECHAZAR",
    "\u{1F44D}",
    "\u2705",
    "\u274C",
    "\u2716\uFE0F",
  ].join("\n");
}

export function isApprovalCommand(body) {
  const normalized = normalizeCommandText(body);
  return (
    normalized === "SI" ||
    normalized === "APROBAR" ||
    normalized === "RECHAZAR" ||
    normalized === "APLICAR" ||
    normalized === "CANCELAR" ||
    body.trim() === "\u{1F44D}" ||
    body.trim() === "\u2705" ||
    body.trim() === "\u274C" ||
    body.trim() === "\u2716" ||
    body.trim() === "\u2716\uFE0F" ||
    normalized.startsWith("APROBAR ") ||
    normalized.startsWith("RECHAZAR ")
  );
}

export function ownerMessagesSince(sinceMs) {
  const ownerDigits = normalizeDigits(approverNumber());
  const messages = [];

  for (const filePath of listSessionFiles()) {
    const entries = parseJsonl(filePath);
    for (const entry of entries) {
      if (entry?.type !== "message" || entry?.message?.role !== "user") continue;

      const at = parseTimestamp(entry.timestamp);
      if (at <= sinceMs) continue;

      const text = extractTextContent(entry);
      if (extractSenderDigits(text) !== ownerDigits) continue;

      const body = extractUserBody(text).trim();
      if (!body) continue;

      messages.push({
        timestamp: entry.timestamp,
        at,
        body,
      });
    }
  }

  return messages.sort((a, b) => a.at - b.at);
}

export function readJsonlFile(filePath) {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function collectRecentActivity(windowHours) {
  const cutoffMs = Date.now() - windowHours * 60 * 60 * 1000;
  const ownerDigits = normalizeDigits(approverNumber());
  const uniqueSenders = new Set();
  const uniqueSessions = new Set();
  let userMessages = 0;
  let audioMessages = 0;
  let imageMessages = 0;
  let documentMessages = 0;
  let audioFriction = 0;
  let attachmentFriction = 0;

  for (const filePath of listSessionFiles()) {
    const entries = parseJsonl(filePath);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry?.type !== "message" || entry?.message?.role !== "user") continue;

      const at = parseTimestamp(entry.timestamp);
      if (at < cutoffMs) continue;

      const text = extractTextContent(entry);
      const senderDigits = extractSenderDigits(text);
      if (!senderDigits || senderDigits === ownerDigits) continue;

      uniqueSenders.add(senderDigits);
      uniqueSessions.add(path.basename(filePath));
      userMessages += 1;

      if (text.includes("<media:audio>")) {
        audioMessages += 1;
      }

      const mediaMatch = text.match(/\[media attached:([^\]]+)\]/i);
      const mediaLabel = String(mediaMatch?.[1] || "").toLowerCase();
      if (mediaLabel.includes("image")) {
        imageMessages += 1;
      } else if (mediaLabel.includes("pdf") || mediaLabel.includes("document") || mediaLabel.includes("application")) {
        documentMessages += 1;
      }

      const next = entries[i + 1];
      if (next?.type !== "message" || next?.message?.role !== "assistant") continue;
      const assistantText = extractTextContent(next);

      if (
        text.includes("<media:audio>") &&
        /no puedo escuchar|no pude transcribir|pasame por texto|mandame.*texto|no tengo reproducci[oó]n/i.test(assistantText)
      ) {
        audioFriction += 1;
      }

      if (
        /\[media attached:[^\]]+(image|pdf|document|application)/i.test(text) &&
        /pasame por aca el mensaje|pasame por texto|reescrib|decime brevemente/i.test(assistantText)
      ) {
        attachmentFriction += 1;
      }
    }
  }

  const leadRegistryPath = path.join(stateDir(), "crm", "lead-registry.jsonl");
  const leads = readJsonlFile(leadRegistryPath).filter((item) => parseTimestamp(item.createdAt) >= cutoffMs);
  const pendingProposal = readJson(pendingProposalFile(), null);

  return {
    windowHours,
    contacts: uniqueSenders.size,
    sessions: uniqueSessions.size,
    userMessages,
    audioMessages,
    imageMessages,
    documentMessages,
    audioFriction,
    attachmentFriction,
    leads: leads.length,
    latestLead: leads[leads.length - 1] || null,
    pendingProposal: pendingProposal?.status === "pending" ? pendingProposal : null,
  };
}

export function collectGatewayStatus() {
  const service = runCommand("systemctl", ["is-active", "openclaw-galfre.service"]);
  const channels = runCommand("sudo", ["-u", openClawUser(), "-H", openClawBin(), "channels", "status"]);
  const ttsStatus = runCommand("sudo", ["-u", openClawUser(), "-H", openClawBin(), "gateway", "call", "tts.status", "--json"]);

  let tts = null;
  try {
    tts = JSON.parse(ttsStatus.stdout || "{}");
  } catch {
    tts = null;
  }

  const whatsappConnected = /whatsapp default:.*connected/i.test(channels.stdout || "");
  return {
    serviceActive: (service.stdout || "").trim() === "active",
    whatsappConnected,
    tts,
  };
}

export function buildOwnerBrief(metrics, gatewayStatus) {
  const lines = [
    "Vector Brief",
    "",
    `Periodo: ultimas ${metrics.windowHours} horas.`,
    "",
    `- Contactos unicos: ${metrics.contacts}`,
    `- Conversaciones activas: ${metrics.sessions}`,
    `- Mensajes de usuarios: ${metrics.userMessages}`,
    `- Audios recibidos: ${metrics.audioMessages}`,
    `- Imagenes recibidas: ${metrics.imageMessages}`,
    `- Documentos/PDF recibidos: ${metrics.documentMessages}`,
    `- Leads registrados: ${metrics.leads}`,
    `- WhatsApp bot: ${gatewayStatus.whatsappConnected ? "conectado" : "revisar conexion"}`,
    `- Servicio principal: ${gatewayStatus.serviceActive ? "activo" : "revisar servicio"}`,
  ];

  if (metrics.pendingProposal) {
    lines.push(`- Propuesta pendiente: ${metrics.pendingProposal.id}`);
  } else {
    lines.push("- Propuesta pendiente: ninguna");
  }

  const observations = [];
  if (metrics.contacts === 0) {
    observations.push("No detecte contactos nuevos en la ventana analizada.");
  }
  if (metrics.contacts > 0 && metrics.leads === 0) {
    observations.push("Hubo conversacion comercial pero no vi leads nuevos registrados; conviene probar derivacion real.");
  }
  if (metrics.audioFriction > 0) {
    observations.push(`Detecte ${metrics.audioFriction} friccion(es) con audio en sesiones recientes.`);
  }
  if (metrics.attachmentFriction > 0) {
    observations.push(`Detecte ${metrics.attachmentFriction} friccion(es) con imagenes o documentos.`);
  }
  if (metrics.latestLead?.lead?.name) {
    observations.push(`Ultimo lead registrado: ${metrics.latestLead.lead.name}.`);
  }

  if (observations.length > 0) {
    lines.push("", "Lectura rapida:");
    for (const item of observations.slice(0, 4)) {
      lines.push(`- ${item}`);
    }
  }

  const suggestions = [];
  if (metrics.contacts === 0) {
    suggestions.push("Revisar entrada de consultas o campanas si esperabas mas movimiento.");
  }
  if (metrics.contacts > 0 && metrics.leads === 0) {
    suggestions.push("Hacer una prueba de handoff real para confirmar que el lead te llegue completo.");
  }
  if (metrics.pendingProposal) {
    suggestions.push(`Si queres aplicar la mejora pendiente, responde APROBAR o \u{1F44D}.`);
  }
  if (metrics.audioMessages > 0 && metrics.audioFriction === 0) {
    suggestions.push("El canal de audio tuvo actividad y no detecte friccion explicita; vale la pena una prueba humana final.");
  }

  if (suggestions.length > 0) {
    lines.push("", "Siguientes acciones sugeridas:");
    for (const item of suggestions.slice(0, 4)) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "Comandos para este chat:", "BRIEF | ESTADO | PROPUESTAS | AUDIO ON | AUDIO OFF | TEST AUDIO | AYUDA");
  return lines.join("\n");
}

export function buildOwnerAudioBrief(metrics, gatewayStatus) {
  const observations = [];
  observations.push(`Vector brief para ${approverName()}.`);
  observations.push(`En las ultimas ${metrics.windowHours} horas detecte ${metrics.contacts} contactos unicos y ${metrics.leads} leads registrados.`);

  if (metrics.pendingProposal) {
    observations.push(`Tenes una propuesta de mejora pendiente con ID ${metrics.pendingProposal.id}.`);
  }

  if (metrics.audioFriction > 0 || metrics.attachmentFriction > 0) {
    observations.push("Tambien vi fricciones de audio o adjuntos que conviene seguir corrigiendo.");
  }

  if (!gatewayStatus.whatsappConnected || !gatewayStatus.serviceActive) {
    observations.push("Hay un punto operativo para revisar en el servicio o en WhatsApp.");
  } else {
    observations.push("El servicio principal y WhatsApp siguen activos.");
  }

  observations.push("Si queres mas detalle, escribime BRIEF o ESTADO.");
  return observations.join(" ");
}

export function ownerStatusText(settings) {
  const gatewayStatus = collectGatewayStatus();
  const pendingProposal = readJson(pendingProposalFile(), null);
  const nextAudio = settings.audioBriefsEnabled ? "activo" : "desactivado";

  return [
    "Vector Estado",
    "",
    `- Servicio principal: ${gatewayStatus.serviceActive ? "activo" : "inactivo"}`,
    `- WhatsApp bot: ${gatewayStatus.whatsappConnected ? "conectado" : "desconectado"}`,
    `- Audio para briefs: ${nextAudio}`,
    `- TTS provider actual: ${gatewayStatus.tts?.provider || "desconocido"}`,
    `- TTS disponible: ${gatewayStatus.tts?.provider ? "si" : "no"}`,
    `- Propuesta pendiente: ${pendingProposal?.status === "pending" ? pendingProposal.id : "ninguna"}`,
    "",
    "Comandos: BRIEF | PROPUESTAS | AUDIO ON | AUDIO OFF | TEST AUDIO | AYUDA",
  ].join("\n");
}

export function pendingProposalText() {
  const pendingProposal = readJson(pendingProposalFile(), null);
  if (!pendingProposal || pendingProposal.status !== "pending") {
    return "Vector Ops\n\nNo hay propuestas pendientes ahora.";
  }

  return [
    "Vector Ops",
    "",
    `Propuesta pendiente: ${pendingProposal.id}`,
    ...pendingProposal.findings.map((finding, index) => `${index + 1}. ${finding.summary}`),
    "",
    `Para aplicarla responde: APROBAR o \u{1F44D}`,
    `Para descartarla responde: RECHAZAR o \u274C`,
  ].join("\n");
}

export function convertTextToSpeech(text) {
  const params = JSON.stringify({ text });
  const result = runCommand("sudo", [
    "-u",
    openClawUser(),
    "-H",
    openClawBin(),
    "gateway",
    "call",
    "tts.convert",
    "--json",
    "--params",
    params,
  ]);

  if (result.status !== 0) {
    throw new Error(result.stderr || "No se pudo convertir texto a audio.");
  }

  const payload = JSON.parse(result.stdout || "{}");
  if (!payload.audioPath) {
    throw new Error("La conversion TTS no devolvio audioPath.");
  }

  return payload;
}

export function sendWhatsAppMedia(mediaPath, message = "") {
  const target = approverNumber();
  const args = [
    "-u",
    openClawUser(),
    "-H",
    openClawBin(),
    "message",
    "send",
    "--channel",
    "whatsapp",
    "--target",
    target,
    "--media",
    mediaPath,
  ];

  if (message.trim()) {
    args.push("--message", message);
  }

  const result = runCommand("sudo", args);
  if (result.status !== 0) {
    throw new Error(result.stderr || `No se pudo enviar media a ${target}`);
  }

  return result.stdout.trim();
}

export function runLocalNodeScript(scriptName, extraArgs = []) {
  const scriptPath = path.join(path.dirname(new URL(import.meta.url).pathname), scriptName);
  return spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    encoding: "utf8",
    stdio: "pipe",
  });
}
