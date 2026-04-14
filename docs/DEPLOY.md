# Deploy

Guia pensada para un VPS Linux con OpenClaw y `n8n`.

## Perfil recomendado

- Ubuntu 24.04
- Node 22
- OpenClaw instalado por usuario dedicado
- `n8n` en el mismo VPS o accesible por red
- `systemd` para mantener el gateway arriba
- `Twenty` opcional pero recomendado como CRM hub
- watchdog `systemd` para detectar gateway zombie y WhatsApp degradado

## Layout sugerido

Ejemplo de estructura en servidor:

```text
/opt/galfre-bot/
  .local/bin/openclaw
  .openclaw/
    openclaw.json
    workspace/
    hooks/
    credentials/
    ops/
  openclaw/
    scripts/
    deploy/
    docs/
```

## Paso a paso

### 1. Instalar OpenClaw

Instalar OpenClaw en el servidor segun la documentacion oficial.

### 2. Crear el estado inicial

Copiar desde este repo:

- `workspace/` -> `~/.openclaw/workspace/`
- `hooks/lead-crm/` -> `~/.openclaw/hooks/lead-crm/`

### 3. Crear configuracion

Tomar como base:

- [`../config/openclaw.example.json`](../config/openclaw.example.json)
- [`../config/openclaw.gemini-fallback.example.json`](../config/openclaw.gemini-fallback.example.json) para un deploy con `google/gemini-2.5-flash` y fallback a `openai/gpt-5.4-mini`

Completar especialmente:

- `env.GEMINI_API_KEY`
- `env.OPENAI_API_KEY`
- `gateway.auth.token`
- `hooks.internal.entries.lead-crm.env.LEAD_DESTINATION`
- `hooks.internal.entries.lead-crm.env.N8N_WEBHOOK_URL`
- `hooks.internal.entries.lead-crm.env.CRM_FANOUT_WEBHOOK_URLS`

### 4. Importar el workflow de n8n

Importar como workflow canonico:

- [`../workflows/n8n/galfredev-master-hub.workflow.json`](../workflows/n8n/galfredev-master-hub.workflow.json)

Y dejarlo activo o publicado.

El master hub ya contempla:

- alta de `Company`, `Person` y `Opportunity` en `Twenty` via GraphQL
- append operativo en `Google Sheets`
- alta complementaria en `Notion`
- alerta interna via `Gmail`

Los workflows `galfredev-crm-hub` y `galfredev-twenty-forward` quedan disponibles solo como referencia o migracion incremental.

### 5. Enlazar WhatsApp

```bash
openclaw channels login --channel whatsapp
```

### 6. Instalar el servicio

Usar como base:

- [`../deploy/openclaw-galfre.service.example`](../deploy/openclaw-galfre.service.example)

Ejemplo:

```bash
sudo cp deploy/openclaw-galfre.service.example /etc/systemd/system/openclaw-galfre.service
sudo systemctl daemon-reload
sudo systemctl enable openclaw-galfre.service
sudo systemctl start openclaw-galfre.service
```

El unit de ejemplo ya contempla:

- `EnvironmentFile=-/opt/galfre-bot/openclaw/.env.production`

Eso permite que el runtime y los hooks lean las mismas variables reales de produccion, incluyendo:

- `N8N_WEBHOOK_URL`
- `CRM_FANOUT_WEBHOOK_URLS`
- `LEAD_DESTINATION`

### 7. Instalar watchdog y recovery automatico

Usar como base:

- [`../deploy/openclaw-healthcheck.service.example`](../deploy/openclaw-healthcheck.service.example)
- [`../deploy/openclaw-healthcheck.timer.example`](../deploy/openclaw-healthcheck.timer.example)

Ejemplo:

```bash
sudo cp deploy/openclaw-healthcheck.service.example /etc/systemd/system/openclaw-healthcheck.service
sudo cp deploy/openclaw-healthcheck.timer.example /etc/systemd/system/openclaw-healthcheck.timer
sudo systemctl daemon-reload
sudo systemctl enable openclaw-healthcheck.timer
sudo systemctl start openclaw-healthcheck.timer
```

Este watchdog:

- corre cada 2 minutos
- valida `openclaw gateway status`
- valida `openclaw channels status --probe`
- reinicia el servicio si detecta gateway zombie o WhatsApp degradado
- envia una alerta por WhatsApp al owner si detecta un incidente
- envia una confirmacion por WhatsApp si la recuperacion automatica sale bien

Importante:

si WhatsApp queda realmente deslogueado o la sesion expira, el watchdog puede reiniciar y registrar el incidente, pero no puede hacer el relink solo. En ese caso hay que ejecutar:

```bash
openclaw channels login --channel whatsapp
```

## Comandos utiles

```bash
systemctl status openclaw-galfre.service
systemctl status openclaw-healthcheck.timer
journalctl -u openclaw-galfre.service -n 100 --no-pager
journalctl -u openclaw-healthcheck.service -n 100 --no-pager
openclaw channels status
openclaw channels status --probe
openclaw gateway status
openclaw models status
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
npm run audit:runtime
```

## Checklist de validacion

Despues del deploy:

1. verificar que el servicio este `active (running)`
2. verificar `openclaw gateway status`
3. verificar `openclaw channels status --probe`
4. verificar `openclaw-healthcheck.timer`
5. probar saludo inicial
6. probar un lead real
7. probar audio o imagen
8. confirmar que el webhook de `n8n` recibe el lead
9. confirmar que `n8n` puede reenviar a `Twenty` si corresponde

## Alertas internas por WhatsApp

El watchdog usa el mismo runtime de OpenClaw para avisarle al owner cuando:

- el gateway se cae
- el RPC deja de responder
- WhatsApp queda `stopped` o `disconnected`
- la recuperacion automatica logra dejar el sistema sano otra vez

Trade-off importante:

si el incidente deja a WhatsApp completamente inutilizable, la alerta interna puede no salir hasta que el sistema se recupere. Por eso igual conviene revisar `journalctl` y no depender solo de la alerta.

## Recomendacion operativa sobre auth

Para bots productivos o vendibles:

- preferi API keys de proveedor
- evita depender de OAuth personal como unica credencial
- separa staging y produccion

## Notas de seguridad

- No publiques `~/.openclaw/credentials`.
- No publiques `auth-profiles.json`.
- No publiques `openclaw.json` real con tokens.
- No publiques logs, media ni registros reales de leads.
- No reutilices el mismo token de gateway en entornos distintos.
