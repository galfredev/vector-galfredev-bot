#!/usr/bin/env bash
set -euo pipefail

APP_USER="${VECTOR_OPENCLAW_USER:-openclaw}"
APP_HOME="${VECTOR_HOME:-/opt/galfre-bot}"
APP_REPO="${VECTOR_REPO_DIR:-$APP_HOME/openclaw}"
APP_STATE="${VECTOR_STATE_DIR:-$APP_HOME/.openclaw}"
APP_PREFIX="${VECTOR_OPENCLAW_PREFIX:-$APP_HOME/.local}"
CONFIG_TEMPLATE="${VECTOR_CONFIG_TEMPLATE:-config/openclaw.gemini-fallback.example.json}"
GATEWAY_PORT="${VECTOR_GATEWAY_PORT:-18789}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_SRC="$(cd "$SCRIPT_DIR/.." && pwd)"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "Ejecuta este script como root en Ubuntu."
  fi
}

install_packages() {
  log "Instalando paquetes base..."
  apt-get update
  apt-get install -y ca-certificates curl git rsync jq ffmpeg psmisc python3
}

install_node() {
  local need_install="false"

  if ! command -v node >/dev/null 2>&1; then
    need_install="true"
  else
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [[ "$major" -lt 22 ]]; then
      need_install="true"
    fi
  fi

  if [[ "$need_install" == "true" ]]; then
    log "Instalando Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    log "Node.js ya esta disponible: $(node -v)"
  fi
}

ensure_user() {
  if ! id "$APP_USER" >/dev/null 2>&1; then
    log "Creando usuario $APP_USER..."
    useradd --home-dir "$APP_HOME" --create-home --shell /bin/bash "$APP_USER"
  fi

  mkdir -p "$APP_HOME" "$APP_PREFIX" "$APP_STATE" "$APP_REPO"
  chown -R "$APP_USER:$APP_USER" "$APP_HOME"
}

sync_repo() {
  log "Sincronizando repo a $APP_REPO..."
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.openclaw' \
    --exclude '.codex-stage' \
    --exclude '.tmp' \
    "$REPO_SRC"/ "$APP_REPO"/

  mkdir -p "$APP_STATE/workspace" "$APP_STATE/hooks" "$APP_STATE/ops"
  rsync -a --delete "$APP_REPO/workspace/" "$APP_STATE/workspace/"
  rsync -a --delete "$APP_REPO/hooks/" "$APP_STATE/hooks/"
  chown -R "$APP_USER:$APP_USER" "$APP_HOME"
}

install_openclaw() {
  log "Instalando/actualizando OpenClaw en $APP_PREFIX..."
  sudo -u "$APP_USER" -H env HOME="$APP_HOME" npm install -g --prefix "$APP_PREFIX" openclaw@latest
}

ensure_config() {
  local config_path="$APP_STATE/openclaw.json"
  if [[ ! -f "$config_path" ]]; then
    log "Creando config inicial desde $CONFIG_TEMPLATE..."
    cp "$APP_REPO/$CONFIG_TEMPLATE" "$config_path"
    chown "$APP_USER:$APP_USER" "$config_path"
  fi

  log "Ajustando paths Linux en openclaw.json..."
  python3 - "$config_path" "$APP_HOME" "$APP_REPO" "$GATEWAY_PORT" <<'PY'
import json, sys
from pathlib import Path

config_path = Path(sys.argv[1])
app_home = sys.argv[2]
app_repo = sys.argv[3]
gateway_port = int(sys.argv[4])

data = json.loads(config_path.read_text(encoding="utf-8-sig"))

data.setdefault("agents", {}).setdefault("defaults", {})["workspace"] = f"{app_home}/.openclaw/workspace"
data["agents"].setdefault("list", [{
    "id": "main",
    "name": "main",
    "workspace": f"{app_home}/.openclaw/workspace",
    "agentDir": f"{app_home}/.openclaw/agents/main/agent",
    "tools": {
        "deny": ["group:web", "browser", "exec", "process", "write", "edit", "apply_patch"]
    }
}])
if data["agents"]["list"]:
    data["agents"]["list"][0]["workspace"] = f"{app_home}/.openclaw/workspace"
    data["agents"]["list"][0]["agentDir"] = f"{app_home}/.openclaw/agents/main/agent"

media = data.setdefault("tools", {}).setdefault("media", {})
audio = media.setdefault("audio", {})
audio["enabled"] = True
audio["models"] = [{
    "type": "cli",
    "command": f"{app_repo}/scripts/openclaw-whisper-stt.sh",
    "args": ["{{MediaPath}}"],
    "timeoutSeconds": 120
}]

channels = data.setdefault("channels", {}).setdefault("whatsapp", {})
channels["enabled"] = True
channels["dmPolicy"] = "open"
channels["allowFrom"] = ["*"]

messages = data.setdefault("messages", {})
messages.setdefault("inbound", {}).setdefault("byChannel", {})["whatsapp"] = 5000
messages.setdefault("queue", {})["mode"] = "collect"
messages["queue"]["debounceMs"] = 2500

gateway = data.setdefault("gateway", {})
gateway["port"] = gateway_port
gateway["mode"] = "local"
gateway["bind"] = "loopback"

config_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY
  chown "$APP_USER:$APP_USER" "$config_path"
}

install_systemd_units() {
  log "Instalando units de systemd..."
  cp "$APP_REPO/deploy/openclaw-galfre.service.example" /etc/systemd/system/openclaw-galfre.service
  cp "$APP_REPO/deploy/openclaw-healthcheck.service.example" /etc/systemd/system/openclaw-healthcheck.service
  cp "$APP_REPO/deploy/openclaw-healthcheck.timer.example" /etc/systemd/system/openclaw-healthcheck.timer
  systemctl daemon-reload
  systemctl enable openclaw-galfre.service
  systemctl enable openclaw-healthcheck.timer
}

config_has_placeholders() {
  python3 - "$APP_STATE/openclaw.json" <<'PY'
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8-sig")
bad = ["replace-with", "+549XXXXXXXXXX", "your-twenty-instance.example.com", "http://127.0.0.1:5678/webhook/galfredev-twenty-forward"]
sys.exit(0 if any(item in text for item in bad) else 1)
PY
}

maybe_start_services() {
  if config_has_placeholders; then
    log "La config todavia tiene placeholders. Dejo los servicios instalados pero no los arranco todavia."
    return
  fi

  log "Iniciando servicios..."
  systemctl restart openclaw-galfre.service
  systemctl restart openclaw-healthcheck.timer
}

print_next_steps() {
  cat <<EOF

Bootstrap base completado.

Rutas importantes:
- Repo: $APP_REPO
- Runtime: $APP_STATE
- Config: $APP_STATE/openclaw.json
- OpenClaw bin: $APP_PREFIX/bin/openclaw

Siguientes pasos obligatorios:
1. Editar la config real:
   nano $APP_STATE/openclaw.json

2. Completar como minimo:
   - env.GEMINI_API_KEY
   - env.OPENAI_API_KEY (opcional como fallback, pero recomendado)
   - hooks.internal.entries.lead-crm.env.LEAD_DESTINATION
   - hooks.internal.entries.lead-crm.env.N8N_WEBHOOK_URL
   - gateway.auth.token

   Recomendado para produccion:
   - crear $APP_REPO/.env.production
   - dejar que systemd lo cargue via EnvironmentFile

3. Validar runtime:
   cd $APP_REPO && npm run audit:runtime

4. Si ya quitaste placeholders:
   systemctl restart openclaw-galfre.service
   systemctl restart openclaw-healthcheck.timer

5. Enlazar WhatsApp:
   sudo -u $APP_USER -H env HOME=$APP_HOME $APP_PREFIX/bin/openclaw channels login --channel whatsapp

6. Verificar salud:
   sudo -u $APP_USER -H env HOME=$APP_HOME $APP_PREFIX/bin/openclaw gateway status
   sudo -u $APP_USER -H env HOME=$APP_HOME $APP_PREFIX/bin/openclaw channels status --probe

7. Ver logs:
   journalctl -u openclaw-galfre.service -n 100 --no-pager
   journalctl -u openclaw-healthcheck.service -n 100 --no-pager

EOF
}

main() {
  require_root
  install_packages
  install_node
  ensure_user
  sync_repo
  install_openclaw
  ensure_config
  install_systemd_units
  maybe_start_services
  print_next_steps
}

main "$@"
