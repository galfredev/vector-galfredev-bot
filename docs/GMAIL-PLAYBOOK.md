# Gmail Playbook

Esta guia define como usar `Gmail` dentro del sistema sin convertirlo en otra fuente de verdad.

## Rol de Gmail

`Gmail` no reemplaza a `Twenty`, `Sheets` ni `Notion`.

Su funcion es:

- alertar a Valentino o al equipo
- dejar seguimiento formal cuando conviene salir de WhatsApp
- enviar correos salientes al lead solo cuando ya hay contexto suficiente

## Dos modos de uso

### 1. Gmail interno

Objetivo:

- avisar que entro un lead importante
- mandar un mini brief del caso
- disparar atencion humana rapida

Destinatario:

- `GMAIL_INTERNAL_ALERT_TO`

Asunto sugerido:

- `Lead calificado: {{company}} - {{person}}`

Body sugerido:

- nombre
- empresa
- problema
- etapa
- link al chat
- link a `Twenty`

### 2. Gmail saliente al lead

Objetivo:

- mandar resumen formal
- confirmar proximo paso
- enviar mensaje posterior a una calificacion positiva
- seguir por mail cuando el lead lo pide o cuando conviene formalizar

Destinatario:

- email del lead, si existe y fue dado de forma explicita

Asunto sugerido:

- `Seguimiento GalfreDev - {{company || person}}`

Body sugerido:

- saludo
- resumen de la necesidad
- propuesta del siguiente paso
- cierre breve

## Cuándo mandar Gmail interno

Mandar correo interno si se cumple al menos una:

- `stage === "qualified"`
- hay adjuntos
- hay imagenes
- el lead pide presupuesto
- el lead pide reunion
- el resumen indica urgencia

## Cuándo mandar Gmail saliente

Mandar correo al lead solo si se cumple todo esto:

- existe un `leadEmail`
- la oportunidad esta en `qualified`
- hay un siguiente paso claro
- el correo no contradice el tono ni la estrategia de WhatsApp

No mandarlo si:

- el lead aun esta frio
- el email no fue confirmado
- la situacion todavia se resuelve mejor por WhatsApp

## Cuerpo recomendado del correo saliente

```text
Hola {{person_name}},

Gracias por compartirnos el contexto de {{company_name || "tu caso"}}.

Entendimos que hoy lo resuelven asi:
{{current_process}}

Y que buscan pasar a algo mas parecido a esto:
{{desired_process}}

Resumen rapido:
{{lead_summary}}

Si te parece, el siguiente paso puede ser {{next_step}}.

Quedo atento.
Valentino / GalfreDev
```

## Variables recomendadas en n8n

- `gmail_internal_subject`
- `gmail_internal_body`
- `gmail_lead_subject`
- `gmail_lead_body`
- `should_send_internal_gmail`
- `should_send_lead_gmail`

## Regla de oro

Si hay duda:

- guardar en `Twenty`
- escribir en `Sheets`
- y no mandar `Gmail` saliente hasta tener contexto suficiente

## Integración con imágenes

Si `hasImageAttachments` o `imageUnderstandingRecommended` es `true`:

- primero analizar la imagen
- luego decidir si hace falta Gmail interno
- no mandar correo saliente al lead basado en una imagen sin resumen humano o validado
