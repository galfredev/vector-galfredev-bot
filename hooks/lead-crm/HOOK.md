---
name: lead-crm
description: "Guarda leads calificados, reenvia adjuntos relevantes y hace webhook a n8n"
homepage: https://docs.openclaw.ai/automation/hooks
metadata:
  { "openclaw": { "emoji": "", "events": ["message:preprocessed", "message:sent"], "requires": { "bins": ["node"] } } }
---

# Lead CRM

Escucha mensajes enriquecidos y mensajes salientes para:

- cachear imagenes y documentos utiles por conversacion
- detectar la nota interna de lead enviada a Valentino
- guardar un registro JSONL local del lead
- reenviar media relevante a Valentino cuando exista
- notificar a n8n por webhook cuando este configurado

## Variables opcionales

- `LEAD_DESTINATION`: numero de WhatsApp interno para la derivacion
- `LEAD_FORWARD_MEDIA`: `true` o `false`
- `N8N_WEBHOOK_URL`: webhook local o remoto para CRM
