# Vector Engineer Handoff

Fecha de corte: 2026-03-27

## Estado actual verificado

- Entorno productivo activo en VPS.
- Servicio principal `openclaw-galfre.service` activo.
- Canal `WhatsApp default` activo, vinculado y conectado.
- Hook interno `lead-crm` cargado y en estado `ready`.

## Stack y componentes en uso

- OpenClaw `2026.3.24`
- Modelo principal `openai-codex/gpt-5.4`
- Modelo de imagen configurado `openai-codex/gpt-5.4`
- WhatsApp como canal principal
- `whisper.cpp` para audio entrante
- Microsoft TTS para audio interno del owner
- Hook interno custom `lead-crm`
- `n8n` como destino de webhook de leads
- `systemd` para operación continua y timers internos
- Node.js / TypeScript / scripts `.mjs`

## Funcionalidades verificadas en real

### 1. Atención comercial por WhatsApp

Verificado:

- El bot responde por WhatsApp en producción.
- Puede mantener una conversación comercial básica con potenciales clientes.
- Puede calificar un lead y continuar la conversación sin cortar el flujo.

### 2. Audio entrante

Verificado:

- El bot procesa audios recibidos por WhatsApp.
- La transcripción local está operativa con `whisper.cpp`.
- El flujo de audio fue probado con audios reales.

### 3. Derivación comercial al owner

Verificado:

- El bot puede cerrar una conversación y pasar al cliente el link directo a Valentino.
- El cierre ahora está instruido para ser contextual y no genérico.
- El link directo usado es `https://wa.me/5493571606142`.

### 4. Lead interno y registro

Verificado:

- El hook `lead-crm` registra leads en disco.
- El hook está listo y cargado en producción.
- Existe registro real de leads en `~/.openclaw/crm/lead-registry.jsonl`.
- El payload del lead contempla nombre, WhatsApp, negocio, necesidad, proceso actual y proceso deseado.

### 5. Canal interno de owner por WhatsApp

Verificado:

- El número owner autorizado es `+54 9 3571 606142`.
- Los comandos internos se procesan por timers dedicados.
- Los comandos `ESTADO`, `BRIEF`, `PROPUESTAS`, `TEST AUDIO` y `AYUDA` respondieron en producción.
- Se corrigió la duplicación de respuestas del canal interno.
- Se corrigió que audios libres del owner quedaran atrapados como comando interno.

### 6. Propuestas de mejora con aprobación por WhatsApp

Verificado:

- El sistema puede generar y enviar propuestas al owner por WhatsApp.
- El owner puede aprobar o rechazar por WhatsApp.
- Están aceptadas estas respuestas:
  - `APROBAR`
  - `NO APROBAR`
  - `RECHAZAR`
  - `👍`
  - `✅`
  - `❌`
  - `✖️`

### 7. Audio interno para el owner

Verificado:

- La conversión TTS funciona en producción.
- Se envió una prueba real por WhatsApp al owner.
- La voz actual quedó configurada en español argentino con voz masculina usando Microsoft TTS.

## Ajustes aplicados para pruebas del owner

- Se evita registrar como lead real una prueba iniciada desde el mismo chat del owner.
- Se evita reenviar al mismo chat del owner la nota interna del lead cuando la prueba sale desde su propio número.

## Funcionalidades no dar por cerradas

### Imágenes

Estado:

- Se activó el `imageModel` en producción.
- La lógica y el prompt fueron ajustados para usar mejor adjuntos visuales.

No marcar como cerrado todavía:

- No hay validación final concluyente de comportamiento estable con imágenes en un caso comercial real post-ajuste.

### Documentos

Estado:

- Los documentos llegan como adjuntos y pueden servir como contexto.

No marcar como cerrado todavía:

- No hay extractor dedicado confirmado para lectura robusta de `DOCX/PDF` complejos.
- El comportamiento actual puede requerir captura puntual o resumen breve del usuario.

## Timers y automatizaciones activas

- `vector-owner-control.timer`
  - chequea comandos internos del owner
- `vector-ops-approval.timer`
  - chequea aprobaciones/rechazos de propuestas
- `vector-owner-brief.timer`
  - envía briefs periódicos al owner

## Archivos clave

- `workspace/AGENTS.md`
- `hooks/lead-crm/handler.ts`
- `scripts/vector-owner-lib.mjs`
- `scripts/vector-owner-control-check.mjs`
- `scripts/vector-owner-brief.mjs`
- `scripts/vector-improvement-check-approval.mjs`
- `config/openclaw.example.json`
- `docs/OPERATIONS.md`
- `docs/TESTING.md`

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

- Conversación comercial simple por texto
- Conversación comercial por audio
- Lead completo hasta cierre con link a Valentino
- Confirmar registro del lead en disco y webhook

### Pendiente especial

- Repetir prueba con imagen
- Repetir prueba con PDF o DOCX
- No marcar esas dos como cerradas hasta ver resultado real posterior al ajuste
