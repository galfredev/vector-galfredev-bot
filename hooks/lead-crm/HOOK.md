---
name: lead-crm
description: "Guarda leads calificados, reenvia adjuntos relevantes y emite payload CRM enriquecido a n8n o webhooks externos"
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
- emitir un payload enriquecido para CRM Hub, Notion, Sheets o cualquier integracion via webhook

## Variables opcionales

- `LEAD_DESTINATION`: numero de WhatsApp interno para la derivacion
- `LEAD_FORWARD_MEDIA`: `true` o `false`
- `N8N_WEBHOOK_URL`: webhook principal de `n8n`
- `CRM_FANOUT_WEBHOOK_URLS`: lista separada por comas para espejar el payload a otros destinos

## Payload emitido

El hook mantiene el payload historico del lead y agrega un bloque `normalized` pensado para:

- `Twenty` como CRM central
- `Notion` para conocimiento y resumentes
- `Google Sheets` para reporting
- integraciones futuras como Gmail o pipelines internos

Ademas, el bloque `normalized` ahora deja listo el terreno para intake multimedia:

- `attachments[]` incluye ruta, tipo MIME, descripcion y si el archivo es imagen
- `syncHints.attachmentCount` resume cuantos adjuntos salieron del hook
- `syncHints.hasImageAttachments` permite rutear vision solo cuando vale la pena
- `syncHints.imageUnderstandingRecommended` deja una senal clara para el workflow maestro

La idea es que el agente no cambie su comportamiento conversacional, pero el evento que sale quede mucho mas listo para orquestacion.
