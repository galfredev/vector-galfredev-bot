# Vector for GalfreDev

Repositorio limpio del bot comercial de WhatsApp de GalfreDev.

Este proyecto guarda la parte versionable del bot:

- prompts y memoria del agente
- hook interno para CRM y reenvio de adjuntos
- script de export de leads
- workflow de `n8n`
- ejemplos de configuracion y deploy

No incluye:

- sesiones de WhatsApp
- credenciales OAuth
- tokens
- runtime state de OpenClaw
- logs o media generada en produccion

## Estructura

- `workspace/`: prompts y contexto del agente
- `hooks/lead-crm/`: hook que registra leads, cachea adjuntos y dispara webhook a `n8n`
- `scripts/`: utilidades locales
- `workflows/n8n/`: workflow de CRM para importar en `n8n`
- `config/`: configuracion de ejemplo para OpenClaw
- `deploy/`: ejemplo de servicio `systemd`
- `docs/`: notas de deploy y publicacion

## Archivos principales

- [workspace/AGENTS.md](D:/DEV/Proyectos/OpenClaw/workspace/AGENTS.md)
- [hooks/lead-crm/handler.ts](D:/DEV/Proyectos/OpenClaw/hooks/lead-crm/handler.ts)
- [config/openclaw.example.json](D:/DEV/Proyectos/OpenClaw/config/openclaw.example.json)
- [workflows/n8n/galfredev-leads.workflow.json](D:/DEV/Proyectos/OpenClaw/workflows/n8n/galfredev-leads.workflow.json)

## Como usar este repo

1. Copiar `config/openclaw.example.json` a tu instalacion real como `~/.openclaw/openclaw.json`.
2. Copiar `workspace/` a `~/.openclaw/workspace/`.
3. Copiar `hooks/lead-crm/` a `~/.openclaw/hooks/lead-crm/`.
4. Importar el workflow de `n8n`.
5. Completar tus secretos y relinkear WhatsApp.

## Notas

- El bot productivo actual usa `gpt-5.4`.
- El hook `lead-crm` envia los leads a un webhook de `n8n` y puede reenviar imagenes/documentos relevantes.
- Este repo esta pensado para publicarse en GitHub sin romper el bot vivo.
