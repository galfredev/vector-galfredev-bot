# LLM Strategy

Fecha de referencia: 2026-04-06.

## Objetivo

Dejar al bot con un modelo principal estable y una opcion mas barata para escalar o fallback sin perder demasiado nivel para atencion comercial por WhatsApp.

## Hallazgos de hoy

- el runtime actual quedo con un cambio manual de modelo que no estaba alineado con los providers configurados
- el bot comercial no necesita un modelo grande para la mayoria de mensajes
- lo importante aca es:
  - buena comprension en espanol
  - respuestas cortas y naturales
  - bajo costo por turno
  - baja latencia
  - integracion simple con el runtime actual

## Recomendacion

### Opcion recomendada hoy: Gemini 2.5 Flash

La mejor opcion para este bot, hoy, es sumar `Gemini 2.5 Flash` como segundo proveedor economico.

Por que:

- esta pensado para velocidad y costo bajo
- suele rendir bien en clasificacion, extraccion y chat comercial corto
- es una opcion razonable para derivacion, calificacion de leads y seguimiento liviano
- convive bien con una estrategia donde el modelo principal premium queda para casos mas sensibles

Casos ideales en este bot:

- saludo inicial
- calificacion comercial
- resumen del lead
- deteccion de intencion
- preguntas cortas de descubrimiento
- follow-up simple

### Opcion secundaria: Qwen

Qwen es atractivo por precio y por su compatibilidad OpenAI-like en algunos endpoints, pero hoy lo veo mejor como opcion secundaria o de laboratorio para este proyecto.

Por que no lo pondria primero aca:

- la nomenclatura que aparece hoy en docs oficiales es `qwen3` y `qwen3.5`; no encontre una familia oficial llamada `qwen 3.6`
- la integracion operativa y la documentacion de proveedor para este stack te va a pedir mas validacion real
- para un bot comercial en produccion me importa mas la estabilidad de proveedor y el DX del equipo que exprimir unos centavos mas

Casos donde si vale probarlo:

- clasificacion de leads
- resumenes internos
- batch offline
- fallback economico para tareas no criticas

## Estrategia sugerida

1. Dejar `openai-codex/gpt-5.4-mini` como baseline estable mientras se ordena la operacion.
2. Integrar `Gemini 2.5 Flash` como proveedor barato para trafico normal.
3. Mantener un flag por tarea:
   - `sales_chat_default`
   - `lead_summary`
   - `owner_ops`
   - `fallback_model`
4. Hacer A/B real con 30 a 50 conversaciones anonimizadas.
5. Medir:
   - tasa de respuesta util
   - tasa de handoff correcto
   - costo por lead atendido
   - latencia p95
   - errores por proveedor

## Decision practica

Si manana hubiera que implementarlo rapido:

- principal operativo inmediato: `openai-codex/gpt-5.4-mini`
- proveedor barato a integrar primero: `Gemini 2.5 Flash`
- proveedor experimental posterior: `Qwen3-8B` o `Qwen-Flash`, segun el endpoint disponible que se quiera validar

## Referencias oficiales

- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Gemini pricing: https://ai.google.dev/pricing
- Alibaba Model Studio OpenAI compatibility: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- Alibaba Model Studio pricing: https://www.alibabacloud.com/help/en/model-studio/billing/
