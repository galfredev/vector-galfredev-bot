# Deploy

## VPS recomendado

- Ubuntu 24.04
- Node 22
- OpenClaw instalado en `/opt/galfre-bot`
- `n8n` corriendo en el mismo servidor o en otro host accesible

## Pasos base

1. Instalar OpenClaw en el servidor.
2. Copiar `workspace/` a `~/.openclaw/workspace/`.
3. Copiar `hooks/lead-crm/` a `~/.openclaw/hooks/lead-crm/`.
4. Crear `~/.openclaw/openclaw.json` a partir de `config/openclaw.example.json`.
5. Completar `LEAD_DESTINATION`, `N8N_WEBHOOK_URL` y `gateway.auth.token`.
6. Importar `workflows/n8n/galfredev-leads.workflow.json` en `n8n`.
7. Instalar y habilitar el servicio `systemd` de ejemplo.
8. Relinkear WhatsApp con `openclaw channels login --channel whatsapp`.

## Comandos utiles

```bash
systemctl status openclaw-galfre.service
journalctl -u openclaw-galfre.service -n 100 --no-pager
openclaw channels status
openclaw channels login --channel whatsapp
```

## Notas de seguridad

- No publiques `~/.openclaw/credentials`.
- No publiques `auth-profiles.json`.
- No publiques `openclaw.json` real con tokens.
- No publiques logs, media ni registros reales de leads.
