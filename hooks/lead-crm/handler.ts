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
  const forwarded: string[] = [];

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
    forwarded.push(item.storedPath);
  }

  await saveCache(cacheFile, items);
  return forwarded;
}

async function postToN8n(payload: unknown) {
  const url = (process.env.N8N_WEBHOOK_URL || "").trim();
  if (!url) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
  let forwardedMedia: string[] = [];
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
    media: forwardedMedia,
    mediaForwardError: mediaForwardError || undefined,
  };

  await ensureDir(crmDir());
  await appendJsonl(path.join(crmDir(), "lead-registry.jsonl"), payload);
  await postToN8n(payload);
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
