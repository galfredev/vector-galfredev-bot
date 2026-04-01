import { appendFile, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type HookEvent = {
  type: string;
  action: string;
  timestamp: Date | string | number;
  context: Record<string, unknown>;
};

type CachedMedia = {
  sourceKey: string;
  from?: string;
  conversationId?: string;
  senderName?: string;
  mediaType?: string;
  storedPath: string;
  originalPath?: string;
  description?: string;
  timestamp: string;
  forwarded?: boolean;
};

type WebhookDispatchResult = {
  target: string;
  ok: boolean;
  error?: string;
};

type ForwardedMedia = {
  storedPath: string;
  mediaType: string;
  description: string;
  timestamp: string;
  isImage: boolean;
};

const SELF_NUMBERS = new Set(["5493571606142", "5493571606142@s.whatsapp.net"]);

function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || "";
}

function stateDir() {
  return path.join(homeDir(), ".openclaw");
}

function crmDir() {
  return path.join(stateDir(), "crm");
}

function mediaCacheDir() {
  return path.join(crmDir(), "media-cache");
}

function normalizeDigits(value: string | undefined) {
  if (!value) return "";
  return value.replace(/\D+/g, "");
}

function normalizeText(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function sourceKeyFromContext(context: Record<string, unknown>) {
  const from = String(context.from || context.senderId || "");
  const conversationId = String(context.conversationId || "");
  const digits = normalizeDigits(from);
  return digits || conversationId || from || "unknown";
}

function isRelevantMediaType(mediaType: string | undefined) {
  if (!mediaType) return false;
  return (
    mediaType.startsWith("image/") ||
    mediaType.startsWith("audio/") ||
    mediaType.startsWith("video/") ||
    mediaType.startsWith("application/pdf") ||
    mediaType.startsWith("application/rtf") ||
    mediaType.startsWith("application/msword") ||
    mediaType.startsWith("application/vnd.") ||
    mediaType.startsWith("application/vnd.openxmlformats-officedocument") ||
    mediaType.startsWith("text/")
  );
}

function eventTimestamp(value: HookEvent["timestamp"]) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function parseLead(content: string) {
  const readField = (...labels: string[]) => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = content.match(new RegExp(`${escaped}:\\s*(.+)`, "i"));
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
    return "";
  };

  const whatsapp = readField("WhatsApp");
  const openChat = readField("Abrir chat");

  return {
    title: content.split("\n")[0]?.trim() || "Nuevo lead",
    name: readField("Nombre"),
    whatsapp,
    whatsappDigits: normalizeDigits(whatsapp || openChat),
    openChat,
    business: readField("Negocio", "Rubro"),
    need: readField("Necesidad"),
    currentProcess: readField("Como lo hacen hoy", "Cómo lo hacen hoy"),
    desiredProcess: readField("Como lo quieren hacer", "Cómo lo quieren hacer", "Objetivo"),
    status: readField("Estado"),
    raw: content,
  };
}

function opportunityTitleFromLead(lead: ReturnType<typeof parseLead>) {
  const business = normalizeText(lead.business);
  const need = normalizeText(lead.need);
  const name = normalizeText(lead.name);

  if (need && business) return `${need} - ${business}`;
  if (need && name) return `${need} - ${name}`;
  if (need) return need;
  if (business) return `Oportunidad - ${business}`;
  if (name) return `Oportunidad - ${name}`;
  return lead.title;
}

function mapLeadStatusToStage(status: string) {
  const normalized = normalizeText(status).toLowerCase();

  if (!normalized) return "new";
  if (/(cerrad|ganad|convertid|cliente)/i.test(normalized)) return "won";
  if (/(perdid|descart|no aplica|sin fit)/i.test(normalized)) return "lost";
  if (/(handoff|derivad|agend|seguim|seguimiento)/i.test(normalized)) return "qualified";
  if (/(calific|interesad|evaluando)/i.test(normalized)) return "qualified";
  return "new";
}

function buildNormalizedPayload(
  lead: ReturnType<typeof parseLead>,
  event: HookEvent,
  forwardedMedia: ForwardedMedia[],
) {
  const context = event.context;
  const occurredAt = eventTimestamp(event.timestamp).toISOString();
  const sourceKey = sourceKeyFromContext(context);
  const personName = normalizeText(lead.name);
  const companyName = normalizeText(lead.business);
  const need = normalizeText(lead.need);
  const currentProcess = normalizeText(lead.currentProcess);
  const desiredProcess = normalizeText(lead.desiredProcess);
  const status = normalizeText(lead.status);
  const senderName = normalizeText(String(context.senderName || ""));
  const attachmentCount = forwardedMedia.length;
  const hasImageAttachments = forwardedMedia.some((item) => item.isImage);
  const hasDocumentAttachments = forwardedMedia.some(
    (item) => !item.isImage && item.mediaType !== "audio/unknown",
  );

  return {
    schemaVersion: "crm-hub.v1",
    source: {
      bot: "Vector",
      brand: "GalfreDev",
      channel: String(context.channelId || "whatsapp"),
      sourceKey,
      conversationId: String(context.conversationId || ""),
      messageId: String(context.messageId || ""),
      occurredAt,
    },
    person: {
      name: personName || senderName || "Lead sin nombre",
      whatsapp: lead.whatsapp || "",
      whatsappDigits: lead.whatsappDigits || "",
      openChat: lead.openChat || "",
      senderName,
    },
    company: {
      name: companyName,
      displayName: companyName || personName || senderName || "Lead sin empresa",
    },
    opportunity: {
      title: opportunityTitleFromLead(lead),
      stage: mapLeadStatusToStage(status),
      status: status || "Nuevo",
      summary: need,
      currentProcess,
      desiredProcess,
      source: "whatsapp",
      owner: "Valentino",
    },
    note: {
      title: lead.title,
      body: lead.raw,
    },
    attachments: forwardedMedia.map((item) => ({
      storedPath: item.storedPath,
      kind: "forwarded-media",
      mediaType: item.mediaType,
      description: item.description,
      timestamp: item.timestamp,
      isImage: item.isImage,
    })),
    syncHints: {
      suggestedSystems: ["twenty", "notion", "google-sheets"],
      gmailThreadRecommended: Boolean(need || companyName || personName),
      createTaskRecommended: Boolean(need),
      attachmentCount,
      hasAttachments: attachmentCount > 0,
      hasImageAttachments,
      hasDocumentAttachments,
      imageUnderstandingRecommended: hasImageAttachments,
    },
  };
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function appendJsonl(filePath: string, payload: unknown) {
  const line = `${JSON.stringify(payload)}\n`;
  await appendFile(filePath, line, "utf8");
}

async function loadCache(filePath: string): Promise<CachedMedia[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCache(filePath: string, items: CachedMedia[]) {
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
}

async function cacheInboundMedia(event: HookEvent) {
  const context = event.context;
  const mediaPath = String(context.mediaPath || "");
  const mediaType = String(context.mediaType || "");
  const from = String(context.from || context.senderId || "");
  const digits = normalizeDigits(from);
  const occurredAt = eventTimestamp(event.timestamp);

  if (!mediaPath || !isRelevantMediaType(mediaType) || SELF_NUMBERS.has(digits)) {
    return;
  }

  const key = sourceKeyFromContext(context);
  const cacheRoot = path.join(mediaCacheDir(), key);
  const originalsDir = path.join(cacheRoot, "files");
  const cacheFile = path.join(cacheRoot, "items.json");
  const basename = path.basename(mediaPath);
  const targetPath = path.join(originalsDir, `${Date.now()}-${basename}`);

  await ensureDir(originalsDir);
  await copyFile(mediaPath, targetPath);

  const items = await loadCache(cacheFile);
  items.push({
    sourceKey: key,
    from,
    conversationId: String(context.conversationId || ""),
    senderName: String(context.senderName || ""),
    mediaType,
    storedPath: targetPath,
    originalPath: mediaPath,
    description: String(context.bodyForAgent || context.body || "").slice(0, 1200),
    timestamp: occurredAt.toISOString(),
    forwarded: false,
  });

  await saveCache(cacheFile, items.slice(-5));
}

function resolveOpenClawCommand() {
  const configured = (process.env.OPENCLAW_BIN || "").trim();
  if (configured) {
    return { file: configured, argsPrefix: [] as string[] };
  }

  if (process.platform === "win32") {
    return { file: "cmd.exe", argsPrefix: ["/c", "openclaw"] };
  }

  return {
    file: path.join(homeDir(), ".local", "bin", "openclaw"),
    argsPrefix: [] as string[],
  };
}

async function forwardMediaIfAny(lead: ReturnType<typeof parseLead>) {
  if ((process.env.LEAD_FORWARD_MEDIA || "true").toLowerCase() !== "true") {
    return [];
  }

  const key = lead.whatsappDigits;
  if (!key) return [];

  const cacheFile = path.join(mediaCacheDir(), key, "items.json");
  const items = await loadCache(cacheFile);
  const pending = items.filter((item) => !item.forwarded);
  if (pending.length === 0) return [];

  const command = resolveOpenClawCommand();
  const destination = process.env.LEAD_DESTINATION || "+5493571606142";
  const forwarded: ForwardedMedia[] = [];

  for (const item of pending.slice(0, 3)) {
    const caption = [
      "Adjunto relevante del lead de GalfreDev",
      lead.name ? `Nombre: ${lead.name}` : "",
      lead.need ? `Necesidad: ${lead.need}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await execFileAsync(command.file, [
      ...command.argsPrefix,
      "message",
      "send",
      "--channel",
      "whatsapp",
      "--target",
      destination,
      "--media",
      item.storedPath,
      "--message",
      caption,
    ]);

    item.forwarded = true;
    forwarded.push({
      storedPath: item.storedPath,
      mediaType: item.mediaType || "application/octet-stream",
      description: item.description || "",
      timestamp: item.timestamp,
      isImage: (item.mediaType || "").startsWith("image/"),
    });
  }

  await saveCache(cacheFile, items);
  return forwarded;
}

async function postToN8n(payload: unknown) {
  const targets = [
    (process.env.N8N_WEBHOOK_URL || "").trim(),
    ...(process.env.CRM_FANOUT_WEBHOOK_URLS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ].filter(Boolean);

  const dedupedTargets = [...new Set(targets)];
  const results: WebhookDispatchResult[] = [];

  if (dedupedTargets.length === 0) return results;

  for (const target of dedupedTargets) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      results.push({ target, ok: true });
    } catch (error) {
      results.push({
        target,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return results;
}

async function handleLeadMessage(event: HookEvent) {
  const context = event.context;
  const content = String(context.content || "");
  const channelId = String(context.channelId || "");
  const success = Boolean(context.success);
  const occurredAt = eventTimestamp(event.timestamp);
  const destinationDigits = normalizeDigits(process.env.LEAD_DESTINATION || "+5493571606142");
  const toDigits = normalizeDigits(String(context.to || ""));
  const looksLikeLead =
    /nuevo lead/i.test(content) &&
    /nombre:/i.test(content) &&
    /necesidad:/i.test(content) &&
    /estado:/i.test(content);

  if (channelId !== "whatsapp" || !success) return;
  if (destinationDigits && toDigits && destinationDigits !== toDigits) return;
  if (!looksLikeLead) return;

  const lead = parseLead(content);
  if (destinationDigits && lead.whatsappDigits && destinationDigits === lead.whatsappDigits) {
    return;
  }

  let forwardedMedia: ForwardedMedia[] = [];
  let mediaForwardError = "";

  try {
    forwardedMedia = await forwardMediaIfAny(lead);
  } catch (error) {
    mediaForwardError = error instanceof Error ? error.message : String(error);
  }

  const payload = {
    createdAt: occurredAt.toISOString(),
    lead,
    delivery: {
      to: String(context.to || ""),
      conversationId: String(context.conversationId || ""),
      messageId: String(context.messageId || ""),
    },
    media: forwardedMedia.map((item) => item.storedPath),
    mediaForwardError: mediaForwardError || undefined,
    normalized: buildNormalizedPayload(lead, event, forwardedMedia),
  };

  const integrationDispatch = await postToN8n(payload);

  await ensureDir(crmDir());
  await appendJsonl(path.join(crmDir(), "lead-registry.jsonl"), {
    ...payload,
    integrationDispatch,
  });
}

const handler = async (event: HookEvent) => {
  if (event.type !== "message") return;

  if (event.action === "preprocessed") {
    await cacheInboundMedia(event);
    return;
  }

  if (event.action === "sent") {
    await handleLeadMessage(event);
  }
};

export default handler;
