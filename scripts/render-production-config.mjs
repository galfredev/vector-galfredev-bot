#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULTS = {
  VECTOR_HOME: "/opt/galfre-bot",
  VECTOR_REPO_DIR: "/opt/galfre-bot/openclaw",
  VECTOR_STATE_DIR: "/opt/galfre-bot/.openclaw",
  VECTOR_GATEWAY_PORT: "18789",
  VECTOR_PRIMARY_MODEL: "google/gemini-2.5-flash",
  VECTOR_FALLBACK_MODEL: "openai/gpt-5.4-mini",
  LEAD_FORWARD_MEDIA: "true",
  CRM_FANOUT_WEBHOOK_URLS: "",
};

const REQUIRED = [
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "LEAD_DESTINATION",
  "N8N_WEBHOOK_URL",
  "GATEWAY_TOKEN",
];

function env(name) {
  return String(process.env[name] ?? DEFAULTS[name] ?? "").trim();
}

function fail(message) {
  console.error(`fail: ${message}`);
  process.exit(1);
}

function ensureRequiredEnv() {
  const missing = REQUIRED.filter((key) => !env(key));
  if (missing.length > 0) {
    fail(`Faltan variables requeridas: ${missing.join(", ")}`);
  }
}

function parseWebhookList(raw) {
  if (!raw) return "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

function buildConfig() {
  const appHome = env("VECTOR_HOME");
  const repoDir = env("VECTOR_REPO_DIR");
  const stateDir = env("VECTOR_STATE_DIR");
  const primaryModel = env("VECTOR_PRIMARY_MODEL");
  const fallbackModel = env("VECTOR_FALLBACK_MODEL");

  return {
    meta: {
      lastTouchedVersion: "2026.3.24",
    },
    env: {
      GEMINI_API_KEY: env("GEMINI_API_KEY"),
      OPENAI_API_KEY: env("OPENAI_API_KEY"),
    },
    agents: {
      defaults: {
        model: {
          primary: primaryModel,
          fallbacks: fallbackModel ? [fallbackModel] : [],
        },
        imageModel: {
          primary: primaryModel,
          fallbacks: fallbackModel ? [fallbackModel] : [],
        },
        pdfModel: {
          primary: primaryModel,
          fallbacks: fallbackModel ? [fallbackModel] : [],
        },
        models: {
          [primaryModel]: {},
          ...(fallbackModel ? { [fallbackModel]: {} } : {}),
        },
        workspace: `${stateDir}/workspace`,
      },
      list: [
        {
          id: "main",
          name: "main",
          workspace: `${stateDir}/workspace`,
          agentDir: `${stateDir}/agents/main/agent`,
          tools: {
            deny: ["group:web", "browser", "exec", "process", "write", "edit", "apply_patch"],
          },
        },
      ],
    },
    tools: {
      deny: ["group:web", "browser", "exec", "process", "write", "edit", "apply_patch"],
      fs: {
        workspaceOnly: true,
      },
      media: {
        models: [
          {
            provider: "google",
            model: "gemini-2.5-flash",
            capabilities: ["image"],
          },
        ],
        image: {
          enabled: true,
          maxBytes: 10485760,
          maxChars: 500,
          attachments: {
            mode: "all",
            maxAttachments: 3,
          },
        },
        audio: {
          enabled: true,
          maxBytes: 20971520,
          models: [
            {
              type: "cli",
              command: `${repoDir}/scripts/openclaw-whisper-stt.sh`,
              args: ["{{MediaPath}}"],
              timeoutSeconds: 120,
            },
          ],
        },
      },
      web: {
        search: {
          enabled: false,
          provider: "duckduckgo",
        },
      },
    },
    commands: {
      native: "auto",
      nativeSkills: "auto",
      restart: true,
      ownerDisplay: "raw",
    },
    session: {
      dmScope: "per-channel-peer",
    },
    messages: {
      inbound: {
        byChannel: {
          whatsapp: 5000,
        },
      },
      queue: {
        mode: "collect",
        debounceMs: 2500,
      },
    },
    channels: {
      whatsapp: {
        enabled: true,
        dmPolicy: "open",
        allowFrom: ["*"],
        selfChatMode: true,
        groupPolicy: "allowlist",
        mediaMaxMb: 50,
      },
    },
    hooks: {
      internal: {
        enabled: true,
        entries: {
          "lead-crm": {
            enabled: true,
            env: {
              LEAD_DESTINATION: env("LEAD_DESTINATION"),
              LEAD_FORWARD_MEDIA: env("LEAD_FORWARD_MEDIA"),
              N8N_WEBHOOK_URL: env("N8N_WEBHOOK_URL"),
              CRM_FANOUT_WEBHOOK_URLS: parseWebhookList(env("CRM_FANOUT_WEBHOOK_URLS")),
            },
          },
        },
      },
    },
    gateway: {
      port: Number(env("VECTOR_GATEWAY_PORT")),
      mode: "local",
      bind: "loopback",
      auth: {
        mode: "token",
        token: env("GATEWAY_TOKEN"),
      },
      tailscale: {
        mode: "off",
        resetOnExit: false,
      },
      nodes: {
        denyCommands: [
          "camera.snap",
          "camera.clip",
          "screen.record",
          "contacts.add",
          "calendar.add",
          "reminders.add",
          "sms.send",
        ],
      },
    },
    plugins: {
      slots: {
        memory: "none",
      },
      entries: {},
    },
    skills: {
      entries: {},
    },
  };
}

function main() {
  ensureRequiredEnv();

  const outputPath =
    process.argv[2] ||
    path.join(env("VECTOR_STATE_DIR"), "openclaw.json");

  const config = buildConfig();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  console.log(`ok: config renderizada en ${outputPath}`);
}

main();
