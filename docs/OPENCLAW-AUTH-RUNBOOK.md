# OpenClaw Auth Runbook

Fecha de referencia: 2026-04-06.

## Objetivo

Tener un procedimiento simple para:

- renovar credenciales rapido
- diagnosticar caidas por auth
- migrar de OAuth personal a API keys estables

## Estado observado en este repo

En el runtime local, el perfil `openai-codex:default` esta vencido.

Archivo:

- `D:\\DEV\\Proyectos\\OpenClaw\\.openclaw\\agents\\main\\agent\\auth-profiles.json`

## Renovar el login actual de Codex OAuth

Segun OpenClaw:

```bash
openclaw models auth login --provider openai-codex
```

Alternativa via onboarding:

```bash
openclaw onboard --auth-choice openai-codex
```

Luego verificar:

```bash
openclaw models status
```

## Migrar a OpenAI API key en vez de OAuth

Esta es la ruta recomendada para produccion mas predecible:

```bash
openclaw onboard --auth-choice openai-api-key
```

Y configurar el modelo como:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.4-mini"
      }
    }
  }
}
```

## Integrar Gemini por API key

OpenClaw documenta:

- env vars aceptadas: `GEMINI_API_KEY` o `GOOGLE_API_KEY`

Setup:

```bash
openclaw onboard --auth-choice gemini-api-key
```

Modo no interactivo:

```bash
openclaw onboard --non-interactive --mode local --auth-choice gemini-api-key --gemini-api-key "$GEMINI_API_KEY"
```

## Integrar Qwen por API key

OpenClaw documenta:

- env var preferida: `QWEN_API_KEY`
- compatibles: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`

Setup recomendado:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

## Para que no vuelva a pasar

1. no usar OAuth humano como unica credencial productiva
2. usar API key por bot o por cliente
3. separar staging de produccion
4. correr chequeos periodicos:
   - `openclaw models status`
   - `npm run check:bot`
5. alertar si hay:
   - 401
   - 402
   - 403
   - 429
   - cooldowns largos
6. no compartir la misma cuenta OAuth entre CLI personal y gateway productivo

## Referencias oficiales

- https://docs.openclaw.ai/concepts/oauth
- https://docs.openclaw.ai/providers/openai
- https://docs.openclaw.ai/providers/google
- https://docs.openclaw.ai/providers/qwen
- https://docs.openclaw.ai/concepts/model-failover
