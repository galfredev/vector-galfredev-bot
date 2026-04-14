# Ubuntu 24/7 Quickstart

Guia corta para dejar `Vector + OpenClaw + WhatsApp` corriendo 24/7 en tu VPS `Ubuntu 24.04`.

## Que hace esta instalacion

- instala dependencias base
- asegura `Node 22`
- crea el usuario `openclaw`
- copia el repo a `/opt/galfre-bot/openclaw`
- instala `OpenClaw`
- crea el runtime en `/opt/galfre-bot/.openclaw`
- instala el servicio principal `systemd`
- instala el watchdog automatico
- deja listo el relink de WhatsApp

## Lo que yo no puedo hacer desde aca

Estas partes siguen siendo manuales si o si:

1. entrar por `SSH` a tu VPS
2. subir o clonar este repo en el VPS
3. completar tus API keys y webhooks reales
4. escanear el QR de WhatsApp

## Paso 1. Entrar al VPS

```bash
ssh root@76.13.69.73
```

## Paso 2. Subir este repo al VPS

Opcion A, desde tu PC con `rsync`:

```bash
rsync -avz --delete /ruta/local/vector/ root@76.13.69.73:/root/vector/
```

Opcion B, desde el VPS con `git clone`:

```bash
cd /root
git clone <URL-DEL-REPO> vector
```

## Paso 3. Ejecutar el bootstrap

Desde el VPS:

```bash
cd /root/vector
bash ./scripts/vps-bootstrap-ubuntu.sh
```

## Paso 4. Generar la config real por comando

No hace falta editar JSON a mano si no queres.

Crear un `.env` productivo:

```bash
cat > /opt/galfre-bot/openclaw/.env.production <<'EOF'
GEMINI_API_KEY=poner_tu_gemini_api_key
OPENAI_API_KEY=poner_tu_openai_api_key
LEAD_DESTINATION=+5493571606142
N8N_WEBHOOK_URL=poner_tu_webhook_real
CRM_FANOUT_WEBHOOK_URLS=
GATEWAY_TOKEN=poner_un_token_largo_y_seguro
VECTOR_HOME=/opt/galfre-bot
VECTOR_REPO_DIR=/opt/galfre-bot/openclaw
VECTOR_STATE_DIR=/opt/galfre-bot/.openclaw
VECTOR_GATEWAY_PORT=18789
EOF
```

Renderizar `openclaw.json`:

```bash
cd /opt/galfre-bot/openclaw
set -a
source ./.env.production
set +a
npm run render:production-config
```

El servicio `systemd` tambien toma ese archivo `.env.production`, asi que no hace falta duplicar manualmente esas variables en otro lado.

Si preferis editar manualmente, igual podes tocar:

```bash
nano /opt/galfre-bot/.openclaw/openclaw.json
```

Si usas `Twenty`, `Notion`, `Sheets` o `Gmail`, completar tambien esos valores.

## Paso 5. Validar y arrancar

```bash
cd /opt/galfre-bot/openclaw
npm run audit:runtime
systemctl restart openclaw-galfre.service
systemctl restart openclaw-healthcheck.timer
```

## Paso 6. Enlazar WhatsApp

```bash
sudo -u openclaw -H env HOME=/opt/galfre-bot /opt/galfre-bot/.local/bin/openclaw channels login --channel whatsapp
```

Escanear el QR desde:

- WhatsApp
- Dispositivos vinculados
- Vincular un dispositivo

## Paso 7. Confirmar salud real

```bash
sudo -u openclaw -H env HOME=/opt/galfre-bot /opt/galfre-bot/.local/bin/openclaw gateway status
sudo -u openclaw -H env HOME=/opt/galfre-bot /opt/galfre-bot/.local/bin/openclaw channels status --probe
```

Esperado:

- gateway `RPC probe: ok`
- WhatsApp `enabled, configured, linked, running, connected`

## Paso 8. Revisar logs

```bash
journalctl -u openclaw-galfre.service -n 100 --no-pager
journalctl -u openclaw-healthcheck.service -n 100 --no-pager
```

## Que queda automatico despues

- arranque al boot
- restart automatico del gateway
- health check cada 2 minutos
- recovery si el gateway queda zombie
- recovery si WhatsApp queda degradado
- alerta por WhatsApp al owner cuando hay incidente
- mensaje por WhatsApp al owner si la recuperacion sale bien

## Cuando igual vas a tener que intervenir

Hay un caso que no conviene automatizar agresivamente:

- si la sesion de WhatsApp expira o Meta la invalida, vas a tener que volver a ejecutar:

```bash
sudo -u openclaw -H env HOME=/opt/galfre-bot /opt/galfre-bot/.local/bin/openclaw channels login --channel whatsapp
```

## Referencias utiles

- [OpenClaw Getting Started](https://docs.openclaw.ai/start/getting-started)
- [OpenClaw WhatsApp](https://docs.openclaw.ai/channels/whatsapp)
- [Deploy interno del repo](./DEPLOY.md)
