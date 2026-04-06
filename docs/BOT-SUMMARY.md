# Resumen Completo del Bot

## Identidad

- nombre operativo: Vector
- marca: GalfreDev
- owner: Valentino
- canal principal: WhatsApp
- funcion principal: atencion comercial, calificacion de leads y derivacion

## Que hace hoy

- responde consultas comerciales de forma breve, clara y profesional
- detecta si el caso encaja con automatizacion, software, IA o integraciones
- pide el minimo contexto necesario
- intenta llegar al handoff con nombre, negocio o empresa, necesidad, como lo hacen hoy y como lo quieren hacer
- deriva a Valentino con link directo
- genera una nota interna de lead
- registra el lead y lo manda a `n8n`
- emite un payload normalizado para CRM Hub
- usa audios, imagenes, capturas, PDFs y documentos como contexto
- reenvia adjuntos relevantes al handoff interno
- puede alimentar `Twenty`, `Google Sheets` y `Notion`
- puede disparar `Gmail` interno y `Gmail` saliente al lead cuando el caso lo justifica

## Capa de owner ops

- reportes de mejora supervisada por WhatsApp
- aprobacion simple con `APROBAR`, `RECHAZAR`, `OK`, `SI`, `NO` y variantes cortas
- brief periodico para Valentino
- comandos internos por WhatsApp:
  - `BRIEF`
  - `ESTADO`
  - `PROPUESTAS`
  - `AUDIO ON`
  - `AUDIO OFF`
  - `TEST AUDIO`
  - `AYUDA`

## Tecnologias

- OpenClaw `2026.3.24`
- `google/gemini-2.5-flash` como modelo principal recomendado
- `openai/gpt-5.4-mini` como fallback recomendado
- WhatsApp channel de OpenClaw
- `n8n` para intake de leads
- `Twenty` como CRM central
- `whisper.cpp` para STT local
- TTS nativo de OpenClaw para owner audio
- TypeScript para hooks
- Node.js para automatizaciones
- PowerShell y Bash para wrappers
- `systemd` timers para tareas periodicas en el VPS

## Como se corre

Servicio principal:

- `openclaw-galfre.service`

Credenciales recomendadas:

- API keys de proveedor por entorno
- evitar OAuth personal como unica credencial productiva

Automatizaciones:

- `vector-ops-analyze.timer`
- `vector-ops-approval.timer`
- `vector-owner-brief.timer`
- `vector-owner-control.timer`

## Datos y artefactos

- workspace del agente: `~/.openclaw/workspace`
- hook de leads: `~/.openclaw/hooks/lead-crm`
- crm local: `~/.openclaw/crm`
- ops y reportes: `~/.openclaw/ops`
- sesiones: `~/.openclaw/agents/main/sessions`

## Estado de arquitectura

Lo que ya esta listo:

- audio entrante
- lectura comercial de adjuntos
- handoff enriquecido
- mejora continua supervisada
- canal interno con owner
- payload normalizado para CRM Hub
- provider principal Gemini con fallback OpenAI por API key

Lo que todavia requiere prueba humana final:

- imagen o PDF real de punta a punta
- lead real de derivacion con registro completo
- brief con audio recibido por WhatsApp
