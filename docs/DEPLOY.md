# Deploy

Guia pensada para un VPS Linux con OpenClaw y `n8n`.

## Perfil recomendado

- Ubuntu 24.04
- Node 22
- OpenClaw instalado por usuario dedicado
- `n8n` en el mismo VPS o accesible por red
- `systemd` para mantener el gateway arriba
- `Twenty` opcional pero recomendado como CRM hub

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

Completar especialmente:

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

## Comandos utiles

```bash
systemctl status openclaw-galfre.service
journalctl -u openclaw-galfre.service -n 100 --no-pager
openclaw channels status
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Checklist de validacion

Despues del deploy:

1. verificar que el servicio este `active (running)`
2. verificar `openclaw channels status`
3. probar saludo inicial
4. probar un lead real
5. probar audio o imagen
6. confirmar que el webhook de `n8n` recibe el lead
7. confirmar que `n8n` puede reenviar a `Twenty` si corresponde

## Notas de seguridad

- No publiques `~/.openclaw/credentials`.
- No publiques `auth-profiles.json`.
- No publiques `openclaw.json` real con tokens.
- No publiques logs, media ni registros reales de leads.
- No reutilices el mismo token de gateway en entornos distintos.
