# Quickstart

Esta guia explica como levantar el proyecto en un entorno nuevo sin usar el runtime real del autor.

## Requisitos

- Linux VPS o servidor local
- Node 22
- OpenClaw instalado
- una cuenta de WhatsApp para enlazar
- `n8n` opcional pero recomendado
- `npm` para validaciones locales del repo

## Paso 1. Copiar archivos del repo

Copia estas carpetas a tu instalacion real de OpenClaw:

- `workspace/` -> `~/.openclaw/workspace/`
- `hooks/lead-crm/` -> `~/.openclaw/hooks/lead-crm/`

## Paso 2. Preparar configuracion

Usa este archivo como base:

- [`config/openclaw.example.json`](../config/openclaw.example.json)

Guardalo como:

- `~/.openclaw/openclaw.json`

Despues ajusta:

- `LEAD_DESTINATION`
- `N8N_WEBHOOK_URL`
- `CRM_FANOUT_WEBHOOK_URLS` si queres espejar eventos
- `TWENTY_BASE_URL`
- `TWENTY_API_KEY`
- `TWENTY_GRAPHQL_URL` si preferis no derivarlo automaticamente desde `TWENTY_BASE_URL`
- `gateway.auth.token`
- rutas del `workspace` y `agentDir` si cambian

## Paso 3. Importar workflow de n8n

Importa como workflow principal:

- [`workflows/n8n/galfredev-master-hub.workflow.json`](../workflows/n8n/galfredev-master-hub.workflow.json)

El webhook esperado es:

```text
http://127.0.0.1:5678/webhook/galfredev-twenty-forward
```

Si tu `n8n` usa otra URL, actualizala en `openclaw.json`.

Los workflows [`galfredev-crm-hub.workflow.json`](../workflows/n8n/galfredev-crm-hub.workflow.json) y
[`galfredev-twenty-forward.workflow.json`](../workflows/n8n/galfredev-twenty-forward.workflow.json)
se conservan como soporte/legacy para migraciones o pruebas parciales, pero el flujo canonico actual es el master hub.

## Paso 3.5. Validar el repo

Instalar dependencias de desarrollo:

```bash
npm install
```

Validaciones utiles:

```bash
npm run check
npm run validate:crm-payload -- path/to/payload.json
```

Links y credenciales necesarias:

- [LIVE-SETUP-CHECKLIST.md](./LIVE-SETUP-CHECKLIST.md)

## Paso 4. Enlazar WhatsApp

Con OpenClaw instalado:

```bash
openclaw channels login --channel whatsapp
```

Escanea el QR desde:

- WhatsApp
- Dispositivos vinculados
- Vincular un dispositivo

## Paso 5. Ejecutar el gateway

Para probar manualmente:

```bash
openclaw gateway
```

Para produccion:

- usa el template de [`deploy/openclaw-galfre.service.example`](../deploy/openclaw-galfre.service.example)

## Paso 6. Validar

Pruebas recomendadas:

1. pedir la web
2. consultar un servicio real
3. mandar un audio
4. mandar una imagen o PDF
5. completar un lead y revisar que llegue a `n8n`
6. verificar que `normalized` exista en el payload

## Problemas comunes

### WhatsApp `session conflict`

Suele pasar si la cuenta ya esta activa en otro Web/Desktop.

Solucion:

1. cerrar sesiones anteriores
2. hacer `channels logout`
3. relinkear con QR nuevo

### El lead no llega a n8n

Revisar:

- `N8N_WEBHOOK_URL`
- logs del hook
- que el workflow este publicado/activo

### El bot responde pero no reenvia adjuntos

Revisar:

- `LEAD_FORWARD_MEDIA=true`
- permisos de escritura del runtime
- que el adjunto sea de tipo soportado
