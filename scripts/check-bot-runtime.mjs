import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const runtimeDir = path.join(rootDir, ".openclaw");
const configPath = path.join(runtimeDir, "openclaw.json");
const agentDir = path.join(runtimeDir, "agents", "main", "agent");
const authProfilesPath = path.join(agentDir, "auth-profiles.json");
const modelsPath = path.join(agentDir, "models.json");
const allowFromPath = path.join(
  runtimeDir,
  "credentials",
  "whatsapp-default-allowFrom.json",
);

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  const normalized = raw.replace(/^\uFEFF/, "");
  return JSON.parse(normalized);
}

async function readJsonIfExists(filePath) {
  try {
    await access(filePath);
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function getProviderFromModel(modelId) {
  if (typeof modelId !== "string") {
    return null;
  }

  const slashIndex = modelId.indexOf("/");
  return slashIndex === -1 ? null : modelId.slice(0, slashIndex);
}

function isPlaceholder(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized.includes("replace-with");
}

function getProvidersFromEnvObject(envObject) {
  const providers = new Set();

  if (!envObject || typeof envObject !== "object") {
    return providers;
  }

  if (typeof envObject.GEMINI_API_KEY === "string" || typeof envObject.GOOGLE_API_KEY === "string") {
    providers.add("google");
  }

  if (typeof envObject.OPENAI_API_KEY === "string") {
    providers.add("openai");
  }

  if (
    typeof envObject.QWEN_API_KEY === "string" ||
    typeof envObject.MODELSTUDIO_API_KEY === "string" ||
    typeof envObject.DASHSCOPE_API_KEY === "string"
  ) {
    providers.add("qwen");
  }

  return providers;
}

async function main() {
  const config = await readJson(configPath);
  const authProfiles = await readJsonIfExists(authProfilesPath);
  const models = await readJsonIfExists(modelsPath);
  const allowFrom = await readJsonIfExists(allowFromPath);

  const failures = [];
  const warnings = [];
  const notes = [];
  const envProviders = getProvidersFromEnvObject(config?.env);

  const whatsapp = config?.channels?.whatsapp ?? {};
  const inboundDebounceMs =
    config?.messages?.inbound?.byChannel?.whatsapp?.debounceMs ??
    config?.messages?.inbound?.debounceMs ??
    null;
  const queueMode = config?.messages?.queue?.mode ?? null;
  const queueDebounceMs = config?.messages?.queue?.debounceMs ?? null;
  const primaryModel = config?.agents?.defaults?.model?.primary ?? null;
  const fallbackModels = Array.isArray(config?.agents?.defaults?.model?.fallbacks)
    ? config.agents.defaults.model.fallbacks
    : [];
  const hookConfig = config?.hooks?.internal?.entries?.["lead-crm"] ?? null;
  const hookEnv = hookConfig?.env ?? {};
  const activeModelIds = [primaryModel, ...fallbackModels].filter((value) => typeof value === "string");
  const activeProviders = new Set(activeModelIds.map(getProviderFromModel).filter(Boolean));

  if (whatsapp.enabled !== true) {
    failures.push("WhatsApp channel is disabled.");
  }

  if (whatsapp.dmPolicy !== "open") {
    failures.push(
      `WhatsApp dmPolicy is '${String(whatsapp.dmPolicy)}' instead of 'open'. New leads can be blocked.`,
    );
  }

  if (typeof inboundDebounceMs !== "number" || inboundDebounceMs <= 0) {
    warnings.push(
      "messages.inbound.byChannel.whatsapp.debounceMs is 0 or missing. Short bursts of user messages can trigger fragmented replies.",
    );
  }

  if (queueMode !== "collect") {
    warnings.push(
      "messages.queue.mode is not 'collect'. Follow-up messages that arrive while the bot is processing can fragment into multiple replies.",
    );
  }

  if (queueMode === "collect" && (typeof queueDebounceMs !== "number" || queueDebounceMs <= 0)) {
    warnings.push(
      "messages.queue.debounceMs is 0 or missing while queue collect mode is enabled.",
    );
  }

  if (Array.isArray(whatsapp.allowFrom) && !whatsapp.allowFrom.includes("*")) {
    failures.push("WhatsApp allowFrom is restricted in config and does not include '*'.");
  }

  if (allowFrom && Array.isArray(allowFrom.allowFrom) && !allowFrom.allowFrom.includes("*")) {
    warnings.push(
      `Persisted allowFrom list only contains ${allowFrom.allowFrom.length} number(s). Pairing-mode leftovers can still block new chats.`,
    );
  }

  if (!primaryModel) {
    failures.push("Primary model is missing from .openclaw/openclaw.json.");
  } else {
    const provider = getProviderFromModel(primaryModel);
    const configuredProviders = new Set([
      ...Object.values(config?.auth?.profiles ?? {}).flatMap((profile) =>
        typeof profile?.provider === "string" ? [profile.provider] : [],
      ),
      ...Object.values(authProfiles?.profiles ?? {}).flatMap((profile) =>
        typeof profile?.provider === "string" ? [profile.provider] : [],
      ),
      ...Object.keys(models?.providers ?? {}),
      ...envProviders,
    ]);

    if (provider && !configuredProviders.has(provider)) {
      failures.push(
        `Primary model '${primaryModel}' points to provider '${provider}', but that provider is not configured in auth/models runtime files.`,
      );
    }
  }

  const openAiProfile = Object.values(authProfiles?.profiles ?? {}).find(
    (profile) => profile?.provider === "openai-codex" && typeof profile?.expires === "number",
  );

  if (openAiProfile?.expires && openAiProfile.expires < Date.now()) {
    if (activeProviders.has("openai-codex")) {
      warnings.push("OpenAI Codex auth profile is expired.");
    } else {
      warnings.push("OpenAI Codex auth profile is expired, but it is no longer part of the active model chain.");
    }
  }

  if (config?.gateway?.auth?.mode === "token" && isPlaceholder(config?.gateway?.auth?.token)) {
    failures.push("Gateway token is still a placeholder value.");
  }

  if (!hookConfig?.enabled) {
    warnings.push("Internal hook 'lead-crm' is disabled.");
  }

  if (!hookEnv.LEAD_DESTINATION) {
    warnings.push("LEAD_DESTINATION is empty.");
  }

  if (!hookEnv.N8N_WEBHOOK_URL) {
    warnings.push("N8N_WEBHOOK_URL is empty.");
  }

  notes.push(`Primary model: ${primaryModel ?? "missing"}`);
  notes.push(
    `Fallbacks: ${fallbackModels.length > 0 ? fallbackModels.join(", ") : "-"}`,
  );
  notes.push(`WhatsApp dmPolicy: ${String(whatsapp.dmPolicy ?? "missing")}`);
  notes.push(`WhatsApp inbound debounce: ${String(inboundDebounceMs ?? "missing")}`);
  notes.push(`Message queue: ${String(queueMode ?? "missing")} / debounce ${String(queueDebounceMs ?? "missing")}`);
  notes.push(
    `Hook lead-crm: ${hookConfig?.enabled ? "enabled" : "disabled"}${hookEnv.N8N_WEBHOOK_URL ? " / webhook configured" : ""}`,
  );

  for (const note of notes) {
    console.log(`info: ${note}`);
  }

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

  console.log("ok: bot runtime config looks ready.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
