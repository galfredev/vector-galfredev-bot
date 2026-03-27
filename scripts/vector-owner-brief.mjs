#!/usr/bin/env node
import {
  buildOwnerAudioBrief,
  buildOwnerBrief,
  collectGatewayStatus,
  collectRecentActivity,
  convertTextToSpeech,
  readOwnerSettings,
  sendWhatsAppMedia,
  writeOwnerSettings,
} from "./vector-owner-lib.mjs";
import { currentIso, logAudit, sendWhatsAppMessage } from "./vector-improvement-lib.mjs";

const manual = process.argv.includes("--manual");
const settings = readOwnerSettings();
const minHours = settings.minHours || 72;
const nowMs = Date.now();
const lastAutoMs = Date.parse(settings.lastAutoBriefAt || 0) || 0;

if (!manual && lastAutoMs > 0 && nowMs - lastAutoMs < minHours * 60 * 60 * 1000) {
  logAudit("owner_brief.skipped_recent", {
    minHours,
    lastAutoBriefAt: settings.lastAutoBriefAt,
  });
  process.exit(0);
}

const metrics = collectRecentActivity(minHours);
const gatewayStatus = collectGatewayStatus();
const textBrief = buildOwnerBrief(metrics, gatewayStatus);

sendWhatsAppMessage(textBrief);

let audioSent = false;
let audioProvider = "";
if (settings.audioBriefsEnabled) {
  try {
    const audioBrief = buildOwnerAudioBrief(metrics, gatewayStatus);
    const converted = convertTextToSpeech(audioBrief);
    sendWhatsAppMedia(converted.audioPath, "Vector Brief en audio");
    audioSent = true;
    audioProvider = converted.provider || "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logAudit("owner_brief.audio_failed", { error: message });
  }
}

const at = currentIso();
if (manual) {
  settings.lastManualBriefAt = at;
} else {
  settings.lastAutoBriefAt = at;
}
writeOwnerSettings(settings);

logAudit("owner_brief.sent", {
  manual,
  windowHours: minHours,
  contacts: metrics.contacts,
  leads: metrics.leads,
  pendingProposal: metrics.pendingProposal?.id || null,
  audioSent,
  audioProvider,
});
