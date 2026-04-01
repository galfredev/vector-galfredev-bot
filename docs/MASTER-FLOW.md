# Flujo Maestro de Vector

Esta guia define el flujo maestro recomendado para que el bot quede consistente, util y mantenible.

## Objetivo

Vector tiene que hacer cuatro cosas bien:

1. captar y calificar leads desde WhatsApp
2. guardar el estado comercial estructurado en `Twenty`
3. dejar rastro operativo simple en `Google Sheets`
4. transformar conversaciones y casos valiosos en conocimiento util dentro de `Notion`

`Gmail` queda como canal complementario para alertas, resumenes, seguimiento interno y follow-up saliente hacia el lead cuando tenga sentido.

## Fuente de verdad

- `Twenty`: fuente de verdad comercial
- `Google Sheets`: tablero operativo y control rapido
- `Notion`: conocimiento reusable
- `Gmail`: alertas y handoff
- `OpenClaw`: conversacion, criterio, calificacion, handoff y contexto del canal

## Topologia final

```text
WhatsApp / WAHA
  -> OpenClaw
  -> hook lead-crm
  -> n8n master intake
      -> Twenty
      -> Google Sheets
      -> Notion
      -> Gmail
      -> respuesta OK
```

## Que guarda cada sistema

### Twenty

Guardar siempre:

- contacto
- empresa o negocio
- oportunidad
- estado y etapa
- resumen del need
- proceso actual y deseado
- link directo al chat
- referencia a adjuntos

Automatizaciones ideales:

- crear o actualizar persona
- crear o actualizar oportunidad
- crear tarea de seguimiento si el lead esta calificado
- crear nota si hubo informacion rica o media relevante

### Google Sheets

Usarlo como espejo operativo liviano.

Columnas recomendadas:

- `createdAt`
- `name`
- `whatsappDigits`
- `openChat`
- `company`
- `opportunityTitle`
- `stage`
- `status`
- `summary`
- `currentProcess`
- `desiredProcess`
- `attachmentCount`
- `hasImageAttachments`

No usar `Sheets` como CRM ni como motor de negocio.

### Notion

Usarlo solo para conocimiento que valga la pena conservar.

Casos ideales:

- objeciones nuevas o buenas respuestas del bot
- prompts comerciales aprobados
- FAQs reales del mercado
- plantillas de respuesta
- casos con imagenes o documentos que aporten aprendizaje

No crear una pagina nueva de Notion por cada lead si no aporta aprendizaje.

### Gmail

Usarlo como canal complementario, no central.

Usos recomendados:

- alerta interna cuando entra un lead con alto valor
- resumen diario o semanal de oportunidades nuevas
- follow-up manual o semiautomatico
- envio de brief cuando haga falta escalar a humano
- envio de correo saliente al lead cuando el caso ya califico y conviene pasar del chat a un canal mas formal

## Reglas de automatizacion

### Siempre

- guardar en `Twenty`
- agregar fila en `Sheets`

### Solo si aporta conocimiento

- crear entrada en `Notion`

### Solo si requiere atencion o seguimiento

- enviar Gmail

## Rama de imagenes

El hook ya expone:

- `normalized.attachments[]`
- `normalized.syncHints.hasImageAttachments`
- `normalized.syncHints.imageUnderstandingRecommended`

Esto permite una rama opcional de vision:

1. si hay imagenes, crear una rama de analisis visual
2. extraer descripcion util del adjunto
3. guardar el resultado como nota en `Twenty`
4. opcionalmente mandar el hallazgo a `Notion`

Casos utiles:

- foto de un local o negocio
- carta/menu
- capturas de procesos manuales
- formularios o presupuestos
- screenshots con errores o dudas del cliente

## Gmail interno vs Gmail saliente

Conviene separar dos usos claramente distintos:

### Gmail interno

Para Valentino o el equipo.

Casos:

- lead calificado con urgencia
- lead con adjuntos relevantes
- lead que pide presupuesto o reunion
- handoff que merece contexto adicional

Asunto sugerido:

- `Lead calificado: {{company}} - {{person}}`

### Gmail saliente al lead

Para el cliente o prospecto.

Casos:

- el lead pide que le escriban por mail
- se va a enviar una propuesta o resumen formal
- el caso ya paso filtro y vale la pena moverlo a un canal mas serio
- hace falta dejar un follow-up claro despues del primer intercambio

No usarlo:

- si el lead no compartio email
- si el caso sigue muy verde
- si el lead solo queria una respuesta corta por WhatsApp
- si el bot no tiene suficiente contexto como para escribir algo util

Asunto sugerido:

- `Seguimiento GalfreDev - {{company || person}}`

Body sugerido:

- saludo corto
- resumen del caso
- siguiente paso concreto
- firma humana o semihumana

## Flujo maestro recomendado en n8n

### Flujo A: Master Intake

Responsabilidad:

- recibir el payload del hook
- normalizar campos operativos
- enviar a `Twenty`
- escribir en `Sheets`
- decidir si crear registro de conocimiento
- decidir si avisar por Gmail
- decidir si corresponde correo saliente al lead

### Flujo B: Twenty Forward

Responsabilidad:

- mantener compatibilidad si todavia existe un workflow webhook dentro de `Twenty`
- servir como puente legado, no como camino canonico

### Flujo C: Knowledge Capture

Responsabilidad:

- filtrar leads o notas que merecen `Notion`
- escribir una entrada legible y breve

### Flujo D: Alerting

Responsabilidad:

- usar `Gmail` para avisos
- no duplicar el dato comercial

## Criterio para Gmail

Mandar correo solo cuando se cumpla al menos una de estas:

- el lead entra en etapa `qualified`
- hay adjuntos o imagenes
- el resumen indica urgencia
- el bot detecta pedido de presupuesto o reunion

### Criterio para Gmail saliente

Mandar correo al lead solo cuando se cumpla todo esto:

- hay email real del lead
- la etapa es `qualified`
- hay siguiente paso claro
- el bot o Valentino ya definieron un tono y mensaje validos

Si falta alguno de esos puntos, mejor dejar solo Gmail interno.

## Criterio para Notion

Crear registro solo cuando se cumpla al menos una de estas:

- hay aprendizaje reutilizable
- hay objecion no trivial
- hay necesidad de documentar contexto
- hay imagen o documento que conviene analizar

## Checklist operativo

- `Twenty` siempre actualizado
- `Sheets` siempre legible y completo
- `Notion` sin ruido ni duplicacion
- `Gmail` solo en casos de valor
- rama de vision solo si hay imagenes

## Proximo paso tecnico

Conectar el workflow maestro real de `n8n` a:

- webhook del hook `lead-crm`
- API GraphQL de `Twenty`
- nodo `Google Sheets`
- nodo o request de `Notion`
- nodo `Gmail` para alertas internas
- nodo `Gmail` opcional para follow-up saliente
- rama opcional de vision si `attachments[]` contiene imagenes

Y mantener la respuesta del webhook final en texto simple `OK` para evitar ruido innecesario.
