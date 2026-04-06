# Operacion y Capacidades

Esta guia resume que hace hoy Vector y que componentes sostienen la operacion productiva.

## Capacidades del bot

- atiende leads comerciales por WhatsApp como asistente de GalfreDev
- califica oportunidades con pocas preguntas y deriva a Valentino cuando ya hay contexto
- arma una nota interna de lead con:
  - nombre
  - WhatsApp
  - link directo al chat
  - negocio o empresa
  - necesidad
  - como lo hacen hoy
  - como lo quieren hacer
  - estado
- registra el lead en `crm/lead-registry.jsonl`
- envia webhook de intake a `n8n`
- emite un payload normalizado apto para CRM Hub
- usa audios como contexto comercial cuando hay transcripcion disponible
- usa imagenes, capturas, PDFs y documentos como contexto comercial
- reenvia adjuntos relevantes al handoff interno cuando corresponde
- cierra la conversacion del cliente con link directo a Valentino

## CRM Hub

La nueva capa de CRM Hub esta pensada para mantener el bot igual de estable, pero mejor conectado.

Rol de cada pieza:

- `OpenClaw`: conversacion, clasificacion y handoff
- hook `lead-crm`: normalizacion de payload y persistencia local
- `n8n`: orquestacion entre sistemas
- `Twenty`: CRM central y fuente de verdad estructurada
- `Notion`: conocimiento reutilizable, SOPs y resumentes
- `Google Sheets`: reporting y vistas operativas
- `Gmail`: alertas internas y follow-up saliente controlado

## Audio e ingreso de adjuntos

- la transcripcion de audio puede resolverse por CLI local con `whisper.cpp`
- en Windows el ejemplo usa `scripts/openclaw-whisper-stt.ps1`
- en Linux el ejemplo usa `scripts/openclaw-whisper-stt.sh`
- el hook `lead-crm` considera como adjuntos relevantes:
  - `image/*`
  - `audio/*`
  - `video/*`
  - `application/pdf`
  - `application/rtf`
  - `application/msword`
  - `application/vnd.*`
  - `text/*`

## Mejora continua supervisada

Vector Ops agrega una capa de supervision controlada:

- analiza sesiones periodicamente
- detecta fricciones de audio y adjuntos
- genera una propuesta de mejora con evidencia
- envia el reporte por WhatsApp al numero autorizado
- espera aprobacion o rechazo del owner
- aplica bloques gestionados en el workspace y reinicia el servicio
- expone un canal interno de comandos para Valentino
- puede generar briefs internos con audio para el owner

Archivos principales:

- `scripts/vector-improvement-analyze.mjs`
- `scripts/vector-improvement-check-approval.mjs`
- `scripts/vector-improvement-apply.mjs`
- `scripts/vector-improvement-lib.mjs`

Templates de despliegue:

- `deploy/vector-ops-analyze.service.example`
- `deploy/vector-ops-analyze.timer.example`
- `deploy/vector-ops-approval.service.example`
- `deploy/vector-ops-approval.timer.example`

## Canal interno del owner

Vector tambien puede operar como asistente interno de Valentino por WhatsApp:

- `BRIEF`: manda un resumen manual
- `ESTADO`: manda estado operativo del bot
- `PROPUESTAS`: resume propuestas pendientes
- `AUDIO ON`: activa audio en briefs
- `AUDIO OFF`: desactiva audio en briefs
- `TEST AUDIO`: envia una prueba de voz
- `AYUDA`: lista comandos

Archivos principales:

- `scripts/vector-owner-lib.mjs`
- `scripts/vector-owner-brief.mjs`
- `scripts/vector-owner-control-check.mjs`

Templates de despliegue:

- `deploy/vector-owner-brief.service.example`
- `deploy/vector-owner-brief.timer.example`
- `deploy/vector-owner-control.service.example`
- `deploy/vector-owner-control.timer.example`

## Servicios productivos esperados

En el VPS se espera algo como:

- `openclaw-galfre.service`: gateway principal del bot
- `vector-ops-analyze.timer`: analisis periodico de mejora
- `vector-ops-approval.timer`: polling de aprobaciones por WhatsApp
- `vector-owner-brief.timer`: brief periodico al owner
- `vector-owner-control.timer`: polling de comandos del owner

## Verificaciones manuales recomendadas

Antes de considerar un deploy como cerrado, conviene probar:

1. un audio real
2. una imagen o PDF real
3. un lead que termine en derivacion a Valentino
4. una aprobacion de propuesta por WhatsApp
5. un `BRIEF` manual desde el chat de Valentino
6. un `TEST AUDIO` desde el chat de Valentino
7. una corrida de `n8n` recibiendo el bloque `normalized`

## Limites conocidos

- que el bot este preparado para entender adjuntos no reemplaza una prueba end-to-end real
- el sistema de mejora continua esta pensado para cambios acotados y gestionados, no para autoeditar toda la estrategia comercial sin supervision
- la integracion con `Twenty`, `Notion`, `Sheets` o Gmail requiere definir credenciales y estructuras reales antes del deploy productivo
- para `Gmail` conviene separar siempre:
  - alertas internas
  - correos salientes al lead
