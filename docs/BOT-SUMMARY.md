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
- usa audios, imagenes, capturas, PDFs y documentos como contexto
- reenvia adjuntos relevantes al handoff interno

## Capa de owner ops

- reportes de mejora supervisada por WhatsApp
- aprobacion simple con `APROBAR`, `RECHAZAR`, `👍`, `✅`, `❌`, `✖️`
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
- OpenAI `gpt-5.4`
- WhatsApp channel de OpenClaw
- `n8n` para intake de leads
- `whisper.cpp` para STT local
- TTS nativo de OpenClaw para owner audio
- TypeScript para hooks
- Node.js para automatizaciones
- PowerShell y Bash para wrappers
- `systemd` timers para tareas periodicas en el VPS

## Como se corre

Servicio principal:

- `openclaw-galfre.service`

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

Lo que todavia requiere prueba humana final:

- imagen o PDF real de punta a punta
- lead real de derivacion con registro completo
- brief con audio recibido por WhatsApp
