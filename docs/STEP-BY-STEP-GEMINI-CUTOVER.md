# Step By Step Gemini Cutover

Fecha de referencia: 2026-04-06.

## Objetivo

Pasarte el orden exacto de acciones para:

1. recuperar el bot actual
2. dejarlo en un esquema estable
3. preparar staging con Gemini 2.5 Flash
4. cortar a produccion sin romper el flujo comercial

## Lo que puedo hacer yo y lo que necesitas hacer vos

### Ya te deje hecho en esta rama

- chequeo de runtime: `npm run check:bot`
- documentacion de auth
- plan de integracion Gemini
- ejemplo de config con Gemini + fallback
- rama de trabajo dedicada

### Lo que solo podes hacer vos

- renovar login interactivo de OpenClaw si queres seguir temporalmente con Codex OAuth
- crear y copiar API keys reales
- relinkear WhatsApp si hubiera conflicto de sesion
- reiniciar el servicio productivo

## Paso 0 - guardar backup del runtime actual

En el host real del bot:

```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.pre-gemini-$(date +%F-%H%M%S).bak
cp ~/.openclaw/agents/main/agent/auth-profiles.json ~/.openclaw/agents/main/agent/auth-profiles.json.pre-gemini-$(date +%F-%H%M%S).bak
```

## Paso 1 - recuperar el bot hoy mismo

### Opcion A - salida rapida

Si queres que responda ya con el provider actual:

```bash
openclaw models auth login --provider openai-codex
openclaw models status
```

Eso abre login interactivo. Hace falta una terminal normal con TTY.

### Opcion B - salida profesional

Migrar ya a API key de OpenAI:

```bash
openclaw onboard --auth-choice openai-api-key
openclaw models status
```

Si queres estabilidad, esta es mejor que seguir con OAuth personal.

## Paso 2 - corregir variables reales del bot

En el host real, confirmar estas variables o valores:

- `LEAD_DESTINATION`
- `N8N_WEBHOOK_URL`
- `CRM_FANOUT_WEBHOOK_URLS`
- `gateway.auth.token`

Si usas archivo `.env` de OpenClaw, completar:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- opcionalmente `QWEN_API_KEY`

## Paso 3 - correr chequeos

En este repo:

```bash
npm install
npm run check
npm run check:bot
```

Esperado:

- `npm run check` verde
- `npm run check:bot` sin auth vencido
- sin warnings de hook vacio

## Paso 4 - staging con Gemini 2.5 Flash

Usar como base:

- `config/openclaw.gemini-fallback.example.json`

En staging:

1. copiarlo como `~/.openclaw/openclaw.json`
2. completar `GEMINI_API_KEY`
3. completar `OPENAI_API_KEY`
4. completar webhook y destino de lead

Si preferis onboarding primero:

```bash
openclaw onboard --auth-choice gemini-api-key
```

## Paso 5 - modelo objetivo en staging

Config objetivo:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-2.5-flash",
        "fallbacks": [
          "openai/gpt-5.4-mini"
        ]
      }
    }
  }
}
```

## Paso 6 - smoke test de staging

Probar exactamente esto:

1. `Hola, queria consultar por sus servicios`
2. `Tengo un negocio y quiero automatizar respuestas por WhatsApp`
3. una nota de voz real
4. una captura o PDF real
5. una conversacion completa que termine en handoff
6. verificar webhook en `n8n`

## Paso 7 - reglas de aprobacion para pasar a produccion

Yo pasaria a produccion solo si:

1. responde bien 30 a 50 conversaciones anonimizadas
2. no empeora la tasa de handoff
3. no empeora audio ni imagen
4. la latencia se mantiene aceptable
5. el costo baja de forma visible

## Paso 8 - cutover a produccion

En el host real:

1. backup
2. copiar config nueva
3. verificar variables
4. reiniciar servicio
5. validar WhatsApp
6. hacer prueba sintetica

Comandos ejemplo:

```bash
systemctl restart openclaw-galfre.service
systemctl status openclaw-galfre.service
openclaw channels status
openclaw models status
```

## Paso 9 - monitoreo continuo

Checklist diario:

1. `openclaw channels status`
2. `openclaw models status`
3. prueba corta de saludo

Checklist semanal:

1. audio
2. imagen
3. lead completo
4. webhook `n8n`
5. revisar cooldowns o errores de auth

## Paso 10 - si queres vender esto a clientes

Patron recomendado:

1. numero de WhatsApp dedicado por cliente
2. API key dedicada por cliente o por entorno
3. `allowlist` en setup, `open` solo cuando el bot este listo
4. fallback de modelo activo
5. runbook de recovery documentado
6. healthcheck automatizado

## Mi recomendacion final

### Hoy

1. reactivar el bot con login o API key OpenAI
2. corregir hook y webhook real

### Esta semana

1. staging Gemini
2. pruebas comparativas

### Despues

1. produccion con `google/gemini-2.5-flash`
2. fallback `openai/gpt-5.4-mini`
3. Qwen solo como experimento controlado
