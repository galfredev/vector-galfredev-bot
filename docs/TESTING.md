# Testing

Esta guia resume como validar que el bot este funcionando bien despues de cambios o despliegues.

## Objetivo

Verificar 3 cosas:

1. que el bot responda bien
2. que el flujo comercial cierre correctamente
3. que el registro interno del lead siga funcionando

Y ahora tambien:

4. que el canal interno con Valentino funcione
5. que el brief y el audio interno lleguen bien

## Casos minimos recomendados

### 1. Saludo inicial

Mensaje sugerido:

```text
Hola, queria consultar por sus servicios
```

Esperado:

- Vector se presenta como asistente de GalfreDev
- menciona automatizacion, software, IA o integraciones
- tono claro y breve

### 2. Consulta que encaja

Mensaje sugerido:

```text
Tengo un negocio y quiero automatizar respuestas por WhatsApp y seguimiento de clientes
```

Esperado:

- detecta que encaja
- hace una o pocas preguntas utiles
- pide nombre antes del handoff si falta

### 3. Consulta que no encaja

Mensaje sugerido:

```text
Quiero una receta de brownies
```

Esperado:

- rechaza con el mensaje definido para consultas fuera de alcance

### 4. Lead calificado

Secuencia sugerida:

```text
Quiero automatizar mi atencion por WhatsApp
```

```text
Hoy lo hacemos manualmente
```

```text
Mi nombre es Juan
```

Esperado:

- resume bien la necesidad
- deriva a Valentino
- cierra la conversacion con un mensaje visible
- genera nota interna de lead

### 5. Audio

Enviar una nota de voz explicando una necesidad real.

Esperado:

- el bot entiende la idea general
- no obliga a reescribir todo
- mantiene el tono comercial

### 6. Imagen o documento

Enviar:

- captura de un proceso
- PDF de requerimiento
- imagen relacionada con el problema

Esperado:

- lo toma como contexto
- no inventa detalles que no se entienden
- si el caso avanza, el adjunto puede formar parte del handoff interno

## Verificaciones tecnicas

## OpenClaw

```bash
openclaw channels status
```

Esperado:

- WhatsApp `linked`
- WhatsApp `running`
- WhatsApp `connected`

## Servicio systemd

```bash
systemctl status openclaw-galfre.service
```

Esperado:

- servicio activo
- sin loops de restart por conflicto de sesion

## n8n

Revisar:

- que el webhook reciba el lead
- que el workflow este publicado o activo

## Riesgos a vigilar

- conflicto de sesion de WhatsApp
- handoff interno duplicado
- cierre vacio al cliente
- webhook de `n8n` caido
- numeros o links mal formados en el lead

## Pruebas rapidas del owner

Desde el chat de Valentino con el bot:

### 1. Brief manual

Mensaje:

```text
BRIEF
```

Esperado:

- llega un brief por WhatsApp
- incluye contactos, leads, estado y propuesta pendiente si existe

### 2. Estado del bot

Mensaje:

```text
ESTADO
```

Esperado:

- informa si el servicio esta activo
- informa si WhatsApp esta conectado
- informa si audio para briefs esta activo

### 3. Test de audio

Mensaje:

```text
TEST AUDIO
```

Esperado:

- llega un audio o adjunto de voz al chat de Valentino

### 4. Toggle de audio

Mensajes:

```text
AUDIO OFF
```

```text
AUDIO ON
```

Esperado:

- confirma cada cambio
- el siguiente brief respeta la preferencia
