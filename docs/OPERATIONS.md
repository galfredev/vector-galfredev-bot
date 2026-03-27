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
- usa audios como contexto comercial cuando hay transcripcion disponible
- usa imagenes, capturas, PDFs y documentos como contexto comercial
- reenvia adjuntos relevantes al handoff interno cuando corresponde
- cierra la conversacion del cliente con link directo a Valentino

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

## Servicios productivos esperados

En el VPS se espera algo como:

- `openclaw-galfre.service`: gateway principal del bot
- `vector-ops-analyze.timer`: analisis periodico de mejora
- `vector-ops-approval.timer`: polling de aprobaciones por WhatsApp

## Verificaciones manuales recomendadas

Antes de considerar un deploy como cerrado, conviene probar:

1. un audio real
2. una imagen o PDF real
3. un lead que termine en derivacion a Valentino
4. una aprobacion de propuesta por WhatsApp

## Limites conocidos

- que el bot este preparado para entender adjuntos no reemplaza una prueba end-to-end real
- el sistema de mejora continua esta pensado para cambios acotados y gestionados, no para autoeditar toda la estrategia comercial sin supervision
