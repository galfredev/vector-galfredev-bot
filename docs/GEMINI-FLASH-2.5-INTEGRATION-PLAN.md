# Gemini 2.5 Flash Integration Plan

Fecha de referencia: 2026-04-06.

## Resumen ejecutivo

Para este bot, la mejor estrategia no es reemplazar todo de golpe.

La recomendacion es:

1. sacar al bot del estado fragil actual
2. dejar la autenticacion en un esquema estable y vendible
3. integrar `google/gemini-2.5-flash` como modelo operativo barato para atencion comercial
4. mantener un fallback premium para casos sensibles
5. separar chat, memoria, audio y webhooks para que un problema de un proveedor no tumbe todo

## Estado actual del proyecto

Hallazgos del runtime local revisado en esta rama:

- el modelo principal habia quedado cambiado manualmente a `groq/llama-3.1-8b-instant`
- el canal de WhatsApp habia quedado cerrado para leads nuevos por `dmPolicy: "pairing"`
- el auth profile de `openai-codex` esta vencido
- el archivo persistido `whatsapp-default-allowFrom.json` todavia contiene solo 3 numeros
- el hook `lead-crm` hoy figura deshabilitado y sin `LEAD_DESTINATION` ni `N8N_WEBHOOK_URL` cargados en este runtime local

Implicancia:

- el bot podia quedar "vivo" tecnicamente, pero no operativo comercialmente
- aun corrigiendo el modelo y el acceso de WhatsApp, si el auth vence, vuelve a quedar afuera
- para vender bots y dejarlos andando, no conviene depender de OAuth personal tipo ChatGPT/Codex

## Lo que dice OpenClaw

Segun la documentacion oficial de OpenClaw:

- el directorio de providers soporta tanto `Google (Gemini)` como `Qwen Cloud`
- el flujo base es autenticar y luego fijar el modelo como `provider/model`
- el provider `google` usa `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- el provider `qwen` usa `QWEN_API_KEY`, con compatibilidad para `MODELSTUDIO_API_KEY` y `DASHSCOPE_API_KEY`
- OpenClaw soporta failover por perfiles dentro del provider y luego por `agents.defaults.model.fallbacks`
- OpenClaw documenta que OAuth funciona, pero tambien explica por que los refresh tokens pueden parecer "perdidos" o quedar invalidados entre herramientas

Fuentes oficiales:

- OpenClaw Provider Directory: https://docs.openclaw.ai/providers
- OpenClaw Google provider: https://docs.openclaw.ai/providers/google
- OpenClaw Qwen provider: https://docs.openclaw.ai/providers/qwen
- OpenClaw OAuth: https://docs.openclaw.ai/concepts/oauth
- OpenClaw Model Failover: https://docs.openclaw.ai/concepts/model-failover
- OpenClaw WhatsApp channel: https://docs.openclaw.ai/channels/whatsapp

## Respuesta corta sobre "que no se venza nunca mas"

No, con OAuth personal no hay garantia seria de "nunca mas".

La razon:

- los refresh tokens pueden rotar
- algunos proveedores invalidan refresh tokens viejos
- si el mismo login vive en varias herramientas, una puede invalidar la otra
- la suscripcion personal no es el patron correcto para un bot productivo multi-cliente

La forma correcta para bots vendibles y siempre encendidos es:

- usar API keys del proveedor para produccion
- usar una cuenta o proyecto propio del bot, no una sesion humana personal
- cargar esas keys en el proceso del gateway o en `~/.openclaw/.env`
- monitorear vencimientos, errores 401, 402, 403, 429 y cooldowns
- configurar fallback de modelo y fallback de provider

En pocas palabras:

- para demo o uso propio: OAuth puede servir
- para produccion y bots para clientes: API key dedicada

## Recomendacion de arquitectura de modelos

### Opcion recomendada

`google/gemini-2.5-flash` como modelo principal de atencion comercial.

`openai/gpt-5.4-mini` como fallback de calidad cuando haya errores del provider principal o conversaciones mas delicadas.

### Opcion experimental

`qwen/qwen3.6-plus` como laboratorio o fallback economico secundario, no como primera eleccion para este bot hoy.

## Por que Gemini 2.5 Flash encaja bien aca

Segun Google:

- `gemini-2.5-flash` es un modelo con contexto de 1M tokens y thinking budgets
- tiene soporte para texto, imagen, video y audio
- el provider de OpenClaw expone chat, image generation, image understanding, audio transcription, video understanding y grounding web

Eso hace match con tu caso:

- WhatsApp comercial
- adjuntos e imagenes
- audios
- mensajes cortos
- clasificacion de leads
- handoff a humano

## Lo que podria cambiar funcionalmente en el bot

### Lo que deberia mantenerse igual

- saludo y tono comercial
- calificacion inicial
- resumen del lead
- handoff a Valentino
- lectura de imagenes y contexto multimodal
- consumo de workflows y hooks del repo

### Lo que puede cambiar

- estilo de redaccion
- longitud de respuestas
- latencia percibida
- manejo de preguntas ambiguas
- forma de resumir audios o capturas
- tendencia a "pensar de mas" si no se controla el thinking budget

### Lo que hay que testear si o si

- mensajes de audio
- imagenes con texto
- PDFs o screenshots
- leads raros o mal redactados
- mensajes cortos como "hola", "precio", "me interesa"
- conversaciones con muchos ida y vuelta

## Riesgos reales de meter Gemini

1. Cambio de comportamiento de redaccion.
2. Diferencias de tool calling frente al flujo actual.
3. Variacion de latencia si se deja reasoning demasiado alto.
4. Riesgo de mezclar el cambio de LLM con otros problemas operativos y no saber que fallo.
5. Si la memoria vectorial sigue apoyada en OpenAI y esa cuota esta agotada, vas a seguir viendo fallas aunque cambies el modelo de chat.

## Riesgos reales de meter Qwen 3.6 Plus

OpenClaw hoy si documenta `qwen/qwen3.6-plus`.

Pero:

- recomienda Standard endpoint cuando queres `qwen3.6-plus`
- aclara que Coding Plan puede quedar atras del catalogo publico
- la operacion se apoya en Qwen Cloud / DashScope con capa OpenAI-compatible

Eso para produccion significa:

- es viable
- no esta descartado
- pero tiene mas superficie operativa que Gemini en este proyecto

## Costos orientativos

### Precios oficiales de referencia

Gemini 2.5 Flash, segun Google:

- input texto/imagen/video: USD 0.30 / 1M
- input audio: USD 1.00 / 1M
- output: USD 2.50 / 1M
- cache texto/imagen/video: USD 0.03 / 1M

Gemini 2.5 Flash-Lite, segun Google:

- input texto/imagen/video: USD 0.10 / 1M
- input audio: USD 0.30 / 1M
- output: USD 0.40 / 1M

GPT-5.4 mini, segun OpenAI:

- input: USD 0.75 / 1M
- cached input: USD 0.075 / 1M
- output: USD 4.50 / 1M

Qwen 3.6 Plus:

- OpenClaw lo lista en el catalogo, pero el precio publicado por Alibaba esta mas claro en familias como `qwen3-8b`, `qwen3-14b`, `qwen3-30b-a3b`
- como referencia oficial de esa familia en Alibaba:
  - `qwen3-8b`: input USD 0.072 / 1M, output non-thinking USD 0.287 / 1M, output thinking USD 0.717 / 1M
  - `qwen3-14b`: input USD 0.144 / 1M, output non-thinking USD 0.574 / 1M, output thinking USD 1.434 / 1M
  - `qwen3-30b-a3b`: input USD 0.108 / 1M, output non-thinking USD 0.431 / 1M, output thinking USD 1.076 / 1M

### Simulacion simple por lead

Supuesto:

- 10 turnos por lead
- 9,000 tokens de entrada acumulados
- 2,200 tokens de salida acumulados
- sin grounding web
- sin audio adicional facturado

Costo aproximado:

- Gemini 2.5 Flash:
  - input: 0.009 x 0.30 = USD 0.0027
  - output: 0.0022 x 2.50 = USD 0.0055
  - total: USD 0.0082 por lead

- Gemini 2.5 Flash-Lite:
  - input: 0.009 x 0.10 = USD 0.0009
  - output: 0.0022 x 0.40 = USD 0.00088
  - total: USD 0.00178 por lead

- GPT-5.4 mini:
  - input: 0.009 x 0.75 = USD 0.00675
  - output: 0.0022 x 4.50 = USD 0.0099
  - total: USD 0.01665 por lead

- Qwen3-8B non-thinking, usando la referencia oficial de Alibaba para esa familia:
  - input: 0.009 x 0.072 = USD 0.000648
  - output: 0.0022 x 0.287 = USD 0.0006314
  - total: USD 0.0012794 por lead

Lectura rapida:

- Gemini 2.5 Flash queda aproximadamente a la mitad de costo de GPT-5.4 mini en este escenario
- Flash-Lite y Qwen chico pueden ser aun mas baratos
- pero el bot comercial no deberia optimizarse solo por precio; importa mucho mas la tasa de handoff correcto y la calidad del entendimiento

## Estrategia recomendada por etapas

### Etapa 0 - estabilizacion inmediata

Objetivo:

- sacar al bot del estado fragil actual

Checklist:

- renovar auth actual o migrar a API key estable
- confirmar `dmPolicy`
- confirmar `allowFrom`
- confirmar `lead-crm`
- confirmar `N8N_WEBHOOK_URL`
- validar audio
- validar imagen
- validar handoff

### Etapa 1 - baseline con OpenAI estable

Objetivo:

- tener una linea base para comparar

Accion:

- dejar `openai/gpt-5.4-mini` o `openai-codex/gpt-5.4-mini` funcionando y medido

Metricas:

- tiempo a primera respuesta
- costo por lead
- calidad del resumen
- cantidad de handoffs correctos
- errores por provider

### Etapa 2 - Gemini 2.5 Flash en staging

Objetivo:

- medir sin romper produccion

Accion:

- crear un entorno o agent de staging
- cargar `GEMINI_API_KEY`
- configurar `google/gemini-2.5-flash`
- usar fallbacks a OpenAI

Configuracion sugerida:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-2.5-flash",
        "fallbacks": [
          "openai/gpt-5.4-mini"
        ]
      },
      "models": {
        "google/gemini-2.5-flash": {},
        "openai/gpt-5.4-mini": {}
      }
    }
  }
}
```

Nota:

- los params finos de thinking conviene validarlos en la version de OpenClaw instalada antes de fijarlos de forma canonica
- en Gemini 2.5 Flash, Google documenta que el `thinkingBudget` se puede poner en `0` para desactivar thinking

### Etapa 3 - tuning de costo

Objetivo:

- bajar costo sin bajar calidad comercial

Pruebas:

- Gemini 2.5 Flash con thinking minimizado
- Gemini 2.5 Flash-Lite solo para clasificacion o resumentes internos
- OpenAI como fallback premium

### Etapa 4 - producto vendible

Objetivo:

- repetir la arquitectura para multiples clientes

Base:

- numero de WhatsApp dedicado por bot
- proyecto de API dedicado por cliente o por tenant
- credenciales separadas
- monitoreo por bot
- checklist de alta, healthcheck y handoff

## Recomendacion de autenticacion para bots vendidos

### Lo que no recomiendo

- usar tu login personal de ChatGPT/Codex para bots de clientes
- depender de un refresh token humano en varios servidores
- mezclar CLI personal y gateway productivo en la misma cuenta

### Lo que si recomiendo

- usar API key por provider
- usar cuenta/proyecto del bot
- guardar secrets solo en el host o secret manager
- versionar solo ejemplos
- monitorear auth y cuotas

### Si igual queres seguir con OpenAI

Para produccion, OpenClaw tambien soporta OpenAI por API key:

- `openclaw onboard --auth-choice openai-api-key`
- modelo directo: `openai/gpt-5.4` o `openai/gpt-5.4-mini`

Eso es mucho mas sano que depender de `openai-codex` OAuth si la prioridad es estabilidad operativa.

## Recomendacion de WhatsApp operativa

OpenClaw recomienda numero dedicado como patron mas limpio.

Para bots comercializables, mi recomendacion es:

- un numero dedicado por bot o por cliente
- politica inicial `allowlist` durante setup
- politica `open` solo cuando el intake ya esta validado
- no usar el numero personal del owner como numero principal del bot

## Observabilidad minima que deberias tener

1. healthcheck del gateway
2. healthcheck de auth del provider
3. healthcheck del webhook de `n8n`
4. prueba sintetica diaria a WhatsApp
5. prueba sintetica semanal con audio e imagen
6. alarma por 401, 402, 403, 429 y por cooldowns largos
7. alarma si `lead-crm` deja de escribir o de enviar webhook

## Plan concreto que recomiendo ejecutar

1. Renovar o reemplazar el auth actual de OpenAI.
2. Mover la ruta productiva a API keys dedicadas.
3. Corregir el runtime local:
   - auth vigente
   - hook activo
   - destino de lead
   - webhook n8n
4. Crear staging con Gemini 2.5 Flash.
5. Medir 30 a 50 conversaciones anonimizadas.
6. Activar `google/gemini-2.5-flash` como primary y `openai/gpt-5.4-mini` como fallback.
7. Luego evaluar Qwen 3.6 Plus como opcion B de laboratorio.

## Decision final recomendada

Si tuviera que tomar una decision hoy para este proyecto:

- chat productivo barato: `google/gemini-2.5-flash`
- fallback premium y robusto: `openai/gpt-5.4-mini`
- opcion experimental o ultra costo: `qwen/qwen3.6-plus` o `qwen/qwen3-8b`, pero no como primer movimiento

## Referencias oficiales

- OpenClaw Provider Directory: https://docs.openclaw.ai/providers
- OpenClaw Google provider: https://docs.openclaw.ai/providers/google
- OpenClaw Qwen provider: https://docs.openclaw.ai/providers/qwen
- OpenClaw OAuth: https://docs.openclaw.ai/concepts/oauth
- OpenClaw Model Failover: https://docs.openclaw.ai/concepts/model-failover
- OpenClaw WhatsApp: https://docs.openclaw.ai/channels/whatsapp
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini thinking: https://ai.google.dev/gemini-api/docs/thinking
- OpenAI pricing: https://openai.com/api/pricing/
- OpenAI GPT-5.4 mini model page: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- Alibaba Model Studio pricing: https://www.alibabacloud.com/help/en/model-studio/model-pricing
