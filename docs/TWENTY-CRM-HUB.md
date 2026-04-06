# Twenty CRM Hub

Esta guia describe la arquitectura objetivo para conectar Vector con `Twenty`, `Notion`, `Google Sheets` y canales operativos sin romper el flujo actual del bot.

## Objetivo

Mantener el comportamiento conversacional de Vector y mejorar la organizacion operativa:

- `Twenty` como CRM central
- `n8n` como orquestador
- `Notion` como base de conocimiento
- `Google Sheets` como reporting
- Gmail como canal complementario cuando haga falta seguimiento

## Principio clave

No mover la logica conversacional fuera de OpenClaw.

La secuencia correcta queda asi:

1. `OpenClaw` conversa y califica.
2. El hook `lead-crm` guarda el registro local y emite un payload enriquecido.
3. `n8n` decide que sistemas actualizar.
4. `Twenty` concentra el estado comercial.
5. `Notion` recibe solo conocimiento util y reusable.
6. `Sheets` recibe datos agregados o filas de reporting.

## Payload normalizado

El hook ahora agrega un bloque `normalized` al registro del lead.

Ese bloque contiene:

- `source`: contexto del evento y de la conversacion
- `person`: datos del contacto
- `company`: datos del negocio o empresa
- `opportunity`: resumen estructurado de la oportunidad
- `note`: resumen textual fuente
- `attachments`: adjuntos reenviados
- `syncHints`: sugerencias de sincronizacion

## Mapeo sugerido a Twenty

Objetos recomendados:

- `People`
- `Companies`
- `Opportunities`
- `Tasks`
- `Notes`

Campos minimos sugeridos:

- persona: nombre, WhatsApp, canal, link al chat
- empresa: nombre comercial
- oportunidad: titulo, estado, etapa, resumen, origen
- nota: texto bruto del handoff

Campos custom utiles:

- `leadSource`
- `leadChannel`
- `currentProcess`
- `desiredProcess`
- `botSummary`
- `needsFollowUp`

## Mapeo sugerido a Notion

No usar `Notion` como CRM principal.

Usarlo para:

- FAQ reales detectadas por el bot
- objeciones recurrentes
- snippets comerciales aprobados
- resumentes semanales
- SOPs de seguimiento

Tambien conviene guardar en `Notion` solo casos que ameritan memoria util:

- leads con objeciones nuevas
- leads con imagenes o documentos que requieran interpretacion
- aprendizajes reutilizables sobre rubros o procesos

## Mapeo sugerido a Google Sheets

Usarlo para:

- tabla plana de leads
- dashboard de etapas
- tasa de respuesta
- conteo por canal
- seguimiento semanal

## Gmail

Gmail no necesita ser el primer paso.

Cuando se habilite, conviene usarlo para:

- seguimiento manual o semiautomatico
- envio de resumenes o propuestas
- notificaciones internas

No conviene usar Gmail como fuente de verdad. El correo debe servir para:

- alertas internas por leads de alto valor
- resumentes diarios o semanales
- follow-up manual o semiautomatico una vez que el lead ya existe en `Twenty`

## Imagenes y adjuntos

El hook ya deja disponible metadata suficiente para que el workflow maestro tome decisiones:

- `normalized.attachments[]`
- `normalized.syncHints.hasImageAttachments`
- `normalized.syncHints.imageUnderstandingRecommended`

La recomendacion es:

1. guardar siempre la referencia del adjunto en `Twenty`
2. enviar a `Sheets` solo una bandera operativa de que hubo adjuntos
3. mandar a `Notion` solo los casos donde la imagen o documento aporte contexto reutilizable
4. habilitar vision como rama opcional, no como requisito para todo lead

## Despliegue incremental

### Fase 1

- mantener webhook actual a `n8n`
- consumir el nuevo bloque `normalized`
- crear workflow de upsert hacia `Twenty`

### Fase 2

- crear pagina o base en `Notion` para conocimiento
- crear hoja de reporting en `Google Sheets`

### Fase 3

- automatizar follow-ups y tareas desde `Twenty`
- sumar Gmail y eventos inversos hacia OpenClaw

## Variables de entorno

Ver:

- [.env.example](../.env.example)
- [config/openclaw.example.json](../config/openclaw.example.json)
- [TWENTY-WORKFLOW-SETUP.md](./TWENTY-WORKFLOW-SETUP.md)

## Criterio de seguridad

- no poner secretos en el repo
- no exponer el gateway de OpenClaw a internet
- usar tokens con privilegios minimos
- mantener a `Twenty` y OpenClaw desacoplados por red y webhooks
