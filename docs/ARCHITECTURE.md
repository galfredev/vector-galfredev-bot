# Architecture

## Resumen

El sistema se divide en 4 piezas principales:

1. `Vector` como agente comercial
2. OpenClaw como runtime y gateway
3. WhatsApp como canal de entrada y salida
4. `n8n` como CRM liviano y automatizador

## Componentes

### 1. Workspace del agente

Ubicado en [`workspace/`](../workspace/).

Contiene:

- identidad del agente
- tono y personalidad
- reglas comerciales
- reglas de calificacion
- memoria del negocio
- datos del fundador y de la marca

El archivo mas importante es [`workspace/AGENTS.md`](../workspace/AGENTS.md).

### 2. OpenClaw

OpenClaw ejecuta:

- el agente
- el canal de WhatsApp
- el gateway de control
- los hooks internos

La configuracion base se modela desde [`config/openclaw.example.json`](../config/openclaw.example.json).

### 3. Hook `lead-crm`

Ubicado en [`hooks/lead-crm/`](../hooks/lead-crm/).

Responsabilidades:

- detectar mensajes de lead interno
- guardar un registro JSONL local
- cachear imagenes y documentos relevantes
- reenviar adjuntos utiles a Valentino
- notificar a `n8n` por webhook

Archivo principal:

- [`hooks/lead-crm/handler.ts`](../hooks/lead-crm/handler.ts)

### 4. n8n

`n8n` recibe el payload del lead por webhook y lo deja listo para automatizaciones posteriores.

Workflow incluido:

- [`workflows/n8n/galfredev-leads.workflow.json`](../workflows/n8n/galfredev-leads.workflow.json)

## Flujo de datos

```mermaid
sequenceDiagram
  participant U as Usuario
  participant W as WhatsApp
  participant O as OpenClaw / Vector
  participant H as Hook lead-crm
  participant N as n8n
  participant V as Valentino

  U->>W: Envia mensaje, audio o imagen
  W->>O: Entrega mensaje al bot
  O->>O: Califica la necesidad
  O->>V: Envia handoff interno si aplica
  O->>U: Respuesta final al cliente
  O->>H: Emite evento de mensaje
  H->>H: Guarda lead y adjuntos relevantes
  H->>N: POST webhook CRM
```

## Decisiones de diseno

### Mantener el runtime fuera del repo

El repo no contiene:

- sesiones
- credenciales
- tokens
- logs
- runtime state

Eso permite:

- publicar el proyecto con seguridad
- versionar solo la parte mantenible
- mover el bot entre servidores sin arrastrar basura local

### Handoff silencioso

El lead no necesita saber si se envio o no una nota interna.

Por eso el bot:

- deriva con un cierre visible
- pero mantiene la notificacion interna separada

### CRM liviano primero

Se eligio `n8n` como primer destino porque:

- es simple de desplegar
- ya estaba en el stack
- permite crecer luego a Sheets, Airtable, Supabase o CRM real

## Extension futura

Ideas naturales para una fase siguiente:

- guardar leads en base SQL
- panel de control de oportunidades
- scoring de leads
- follow-up automatico
- multiples numeros o multiples agentes
