#!/usr/bin/env node
import {
  convertTextToSpeech,
  isApprovalCommand,
  ownerCommandHelp,
  ownerMessagesSince,
  ownerStatusText,
  pendingProposalText,
  readOwnerControlState,
  readOwnerSettings,
  runLocalNodeScript,
  sendWhatsAppMedia,
  writeOwnerControlState,
  writeOwnerSettings,
} from "./vector-owner-lib.mjs";
import { currentIso, logAudit, normalizeCommandText, sendWhatsAppMessage } from "./vector-improvement-lib.mjs";

const state = readOwnerControlState();
const settings = readOwnerSettings();
const messages = ownerMessagesSince(Number(state.lastProcessedAt || 0));

if (messages.length === 0) {
  process.exit(0);
}

let lastProcessedAt = Number(state.lastProcessedAt || 0);

for (const item of messages) {
  const body = item.body.trim();
  const normalized = normalizeCommandText(body);
  lastProcessedAt = Math.max(lastProcessedAt, item.at);

  if (!body || isApprovalCommand(body)) {
    continue;
  }

  if (normalized === "AYUDA" || normalized === "HELP" || normalized === "MENU") {
    sendWhatsAppMessage(ownerCommandHelp());
    logAudit("owner_control.help", { body, at: item.timestamp });
    continue;
  }

  if (normalized === "ESTADO" || normalized === "STATUS") {
    sendWhatsAppMessage(ownerStatusText(settings));
    logAudit("owner_control.status", { body, at: item.timestamp });
    continue;
  }

  if (normalized === "PROPUESTAS" || normalized === "PROPUESTA") {
    sendWhatsAppMessage(pendingProposalText());
    logAudit("owner_control.proposals", { body, at: item.timestamp });
    continue;
  }

  if (normalized === "BRIEF" || normalized === "RESUMEN" || normalized === "REPORTE") {
    const result = runLocalNodeScript("vector-owner-brief.mjs", ["--manual"]);
    if (result.status !== 0) {
      sendWhatsAppMessage(
        `Vector Owner\n\nNo pude generar el brief manual.\n\n${(result.stderr || result.stdout || "Sin detalle").slice(0, 1200)}`,
      );
      logAudit("owner_control.brief_failed", { stderr: result.stderr, stdout: result.stdout, at: item.timestamp });
    }
    continue;
  }

  if (
    normalized === "AUDIO" ||
    normalized === "AUDIO ON" ||
    normalized === "AUDIO SI" ||
    normalized === "ACTIVAR AUDIO" ||
    normalized === "VOZ ON"
  ) {
    settings.audioBriefsEnabled = true;
    writeOwnerSettings(settings);
    sendWhatsAppMessage("Vector Owner\n\nAudio para briefs activado.");
    logAudit("owner_control.audio_on", { at: item.timestamp });
    continue;
  }

  if (
    normalized === "AUDIO OFF" ||
    normalized === "AUDIO NO" ||
    normalized === "DESACTIVAR AUDIO" ||
    normalized === "VOZ OFF"
  ) {
    settings.audioBriefsEnabled = false;
    writeOwnerSettings(settings);
    sendWhatsAppMessage("Vector Owner\n\nAudio para briefs desactivado.");
    logAudit("owner_control.audio_off", { at: item.timestamp });
    continue;
  }

  if (normalized === "TEST AUDIO" || normalized === "PROBAR AUDIO") {
    try {
      const converted = convertTextToSpeech(
        `Hola Valentino. Esta es una prueba de audio del canal interno de Vector generada el ${currentIso()}.`,
      );
      sendWhatsAppMedia(converted.audioPath, "Prueba de audio interna");
      logAudit("owner_control.audio_test", { at: item.timestamp, provider: converted.provider || "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendWhatsAppMessage(`Vector Owner\n\nNo pude generar el audio de prueba.\n\n${message}`);
      logAudit("owner_control.audio_test_failed", { at: item.timestamp, error: message });
    }
    continue;
  }
}

writeOwnerControlState({
  lastProcessedAt,
  updatedAt: currentIso(),
});
