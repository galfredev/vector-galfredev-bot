# Vector Engineer Handoff

Fecha de corte: 2026-04-06

## Estado actual verificado

- Entorno productivo activo en VPS.
- Servicio principal `openclaw-galfre.service` activo.
- Canal `WhatsApp default` activo, vinculado y conectado.
- Hook interno `lead-crm` cargado y en estado `ready`.
- Modelo principal productivo cambiado a `google/gemini-2.5-flash`.
- Fallback productivo configurado en `openai/gpt-5.4-mini`.

## Incidente resuelto

El `2026-04-06` el bot quedo sin responder por un problema de OAuth:

- provider afectado: `openai-codex`
- error: `refresh_token_reused`
- efecto: el gateway seguia vivo, pero el agente fallaba antes de responder

Acciones aplicadas:

- reautenticacion interactiva de `openai-codex`
- migracion de produccion a API keys
- configuracion nueva:
  - primary `google/gemini-2.5-flash`
  - fallback `openai/gpt-5.4-mini`

## Stack y componentes en uso

- OpenClaw `2026.3.24`
- Modelo principal `google/gemini-2.5-flash`
- Fallback `openai/gpt-5.4-mini`
- Provider legado aun presente en auth store: `openai-codex`
- WhatsApp como canal principal
- `whisper.cpp` para audio entrante
- Microsoft TTS para audio interno del owner
- Hook interno custom `lead-crm`
- `n8n` como destino de webhook de leads
- `systemd` para operacion continua y timers internos
- Node.js / TypeScript / scripts `.mjs`

## Funcionalidades verificadas en real

### 1. Atencion comercial por WhatsApp

Verificado:

- El bot responde por WhatsApp en produccion.
- Puede mantener una conversacion comercial basica con potenciales clientes.
- Puede calificar un lead y continuar la conversacion sin cortar el flujo.

### 2. Audio entrante

Verificado:

- El bot procesa audios recibidos por WhatsApp.
- La transcripcion local esta operativa con `whisper.cpp`.
- El flujo de audio fue probado con audios reales.

### 3. Derivacion comercial al owner

Verificado:

- El bot puede cerrar una conversacion y pasar al cliente el link directo a Valentino.
- El cierre esta instruido para ser contextual y no generico.
- El link directo usado es `https://wa.me/5493571606142`.

### 4. Lead interno y registro

Verificado:

- El hook `lead-crm` registra leads en disco.
- El hook esta listo y cargado en produccion.
- Existe registro real de leads en `~/.openclaw/crm/lead-registry.jsonl`.
- El payload contempla nombre, WhatsApp, negocio, necesidad, proceso actual y proceso deseado.

### 5. Canal interno de owner por WhatsApp

Verificado:

- El numero owner autorizado es `+54 9 3571 606142`.
- Los comandos internos se procesan por timers dedicados.
- Los comandos `ESTADO`, `BRIEF`, `PROPUESTAS`, `TEST AUDIO` y `AYUDA` respondieron en produccion.
- Se corrigio la duplicacion de respuestas del canal interno.
- Se corrigio que audios libres del owner quedaran atrapados como comando interno.

### 6. Propuestas de mejora con aprobacion por WhatsApp

Verificado:

- El sistema puede generar y enviar propuestas al owner por WhatsApp.
- El owner puede aprobar o rechazar por WhatsApp.
- Estan aceptadas estas respuestas:
  - `APROBAR`
  - `NO APROBAR`
  - `RECHAZAR`
  - `OK`
  - `SI`
  - `NO`

### 7. Audio interno para el owner

Verificado:

- La conversion TTS funciona en produccion.
- Se envio una prueba real por WhatsApp al owner.
- La voz actual esta configurada en espanol argentino con voz masculina usando Microsoft TTS.

## Ajustes aplicados para pruebas del owner

- Se evita registrar como lead real una prueba iniciada desde el mismo chat del owner.
- Se evita reenviar al mismo chat del owner la nota interna del lead cuando la prueba sale desde su propio numero.

## Funcionalidades no dar por cerradas

### Imagenes

Estado:

- La logica y el prompt fueron ajustados para usar mejor adjuntos visuales.

No marcar como cerrado todavia:

- No hay validacion final concluyente de comportamiento estable con imagenes en un caso comercial real post-ajuste.

### Documentos

Estado:

- Los documentos llegan como adjuntos y pueden servir como contexto.

No marcar como cerrado todavia:

- No hay extractor dedicado confirmado para lectura robusta de `DOCX/PDF` complejos.
- El comportamiento actual puede requerir captura puntual o resumen breve del usuario.

## Timers y automatizaciones activas

- `vector-owner-control.timer`
  - chequea comandos internos del owner
- `vector-ops-approval.timer`
  - chequea aprobaciones o rechazos de propuestas
- `vector-owner-brief.timer`
  - envia briefs periodicos al owner

## Archivos clave

- `workspace/AGENTS.md`
- `hooks/lead-crm/handler.ts`
- `scripts/vector-owner-lib.mjs`
- `scripts/vector-owner-control-check.mjs`
- `scripts/vector-owner-brief.mjs`
- `scripts/vector-improvement-check-approval.mjs`
- `config/openclaw.gemini-fallback.example.json`
- `docs/OPERATIONS.md`
- `docs/TESTING.md`
- `docs/OPENCLAW-AUTH-RUNBOOK.md`

## Pruebas recomendadas para QA final

### Owner

- Enviar `ESTADO`
- Enviar `BRIEF`
- Enviar `PROPUESTAS`
- Enviar `TEST AUDIO`
- Aprobar una propuesta con `APROBAR`
- Rechazar una propuesta con `NO APROBAR`
- Enviar un audio libre y confirmar que no entre como comando

### Cliente

- Conversacion comercial simple por texto
- Conversacion comercial por audio
- Lead completo hasta cierre con link a Valentino
- Confirmar registro del lead en disco y webhook

### Pendiente especial

- Repetir prueba con imagen
- Repetir prueba con PDF o DOCX
- No marcar esas dos como cerradas hasta ver resultado real posterior al ajuste
