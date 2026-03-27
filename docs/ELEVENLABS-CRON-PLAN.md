# ElevenLabs y Cron para Vector

Esta nota aterriza que partes de ElevenLabs y del scheduler de OpenClaw realmente conviene usar en Vector, tomando en cuenta el codigo actual y el despliegue productivo.

## Estado actual de Vector

Hoy Vector ya tiene:

- WhatsApp conectado al gateway
- transcripcion de audio por CLI local con `whisper.cpp`
- interpretacion comercial de imagenes, PDFs y documentos
- handoff de leads hacia Valentino con webhook a `n8n`
- mejora continua supervisada por timers del sistema y aprobacion por WhatsApp

## Recomendacion general

No conviene reemplazar ahora el audio entrante local por ElevenLabs.

La razon es simple:

- el audio entrante ya esta resuelto con `whisper.cpp`
- ese camino es local, barato y estable
- meter ElevenLabs como STT principal agregaria costo, red y mas puntos de falla

Si mas adelante aparecen problemas de calidad concretos, la mejor evolucion seria un fallback:

1. intentar primero con el transcriptor local
2. si falla o queda vacio, usar un segundo proveedor cloud

## Donde ElevenLabs si aporta valor real

La mejor oportunidad no es el STT de clientes, sino la voz saliente para el owner.

Casos utiles:

- reporte diario de leads en nota de voz
- resumen de mejoras detectadas por Vector Ops en audio
- alerta de incidentes importantes del bot en voz
- brief comercial matinal para Valentino

Esto mantiene el bot comercial orientado a texto para clientes y usa voz solo donde de verdad suma.

## Cron de OpenClaw vs timers del sistema

Para Vector hoy ya existe un subsistema estable de mejora continua usando `systemd` timers.

Eso sigue siendo la opcion correcta para:

- analisis periodico de sesiones
- polling de aprobaciones
- tareas de mantenimiento del VPS
- reinicios o chequeos operativos

OpenClaw cron si conviene para una segunda capa mas "agente":

- jobs que necesiten contexto del agente
- briefings resumidos con lenguaje natural
- tareas que deban publicar al owner por chat en nombre del agente

## Arquitectura recomendada para una fase 2

### 1. Mantener lo actual

- `systemd` timers siguen manejando la mejora continua
- `whisper.cpp` sigue manejando audio entrante
- el canal principal con clientes sigue siendo texto

### 2. Agregar un skill de ElevenLabs orientado al owner

Objetivo:

- convertir un texto de resumen a MP3 u OGG
- enviarlo por WhatsApp a Valentino como adjunto de voz

Ese skill no deberia quedar expuesto al flujo comun de clientes.
Deberia usarse solo para reportes internos o cron jobs aislados.

### 3. Si usamos OpenClaw cron, hacerlo en modo aislado

Configuracion recomendada:

- `sessionTarget: "isolated"`
- `payload.kind: "agentTurn"`
- `delivery.mode: "none"`

Y dentro del turno del agente:

- generar el audio
- enviar el media explicitamente con la herramienta de mensajes

Esto evita mezclar esa automatizacion con la sesion comercial principal.

## Que no recomiendo ahora

- que Vector le responda por voz a todos los clientes por defecto
- reemplazar el STT local por ElevenLabs sin una necesidad real
- dejar que cron modifique prompts o codigo automaticamente sin aprobacion humana
- meter skills genericos de internet directo en el bot de ventas sin auditoria

## Candidato concreto de mejora

La mejora mas sensata para la siguiente iteracion es:

`reporte diario de owner en texto + opcion de nota de voz`

Flujo:

1. Vector Ops detecta hallazgos o resume leads
2. genera el texto del reporte
3. opcionalmente lo transforma en audio con ElevenLabs
4. lo manda a Valentino por WhatsApp
5. Valentino responde `APROBAR` o `RECHAZAR` si corresponde

## Conclusiones

Lo mas valioso del material investigado para Vector no es rehacer lo ya resuelto, sino sumar una capa premium de voz saliente para el owner y reservar OpenClaw cron para tareas aisladas de tipo briefing.

En otras palabras:

- STT local para clientes: si
- timers del sistema para mantenimiento: si
- ElevenLabs para voz interna del owner: si, como siguiente fase
- cron de OpenClaw para esa voz interna o briefs: si, pero aislado y con delivery controlado
