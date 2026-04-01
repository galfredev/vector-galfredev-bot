# Live Setup Checklist

Esta guia resume exactamente que hace falta para dejar la conexion viva entre Vector, `n8n`, `Twenty`, `Notion`, `Google Sheets` y `Gmail`.

## Orden recomendado

1. confirmar URLs productivas de `n8n`
2. confirmar `Twenty` por API y/o workflow legado
3. crear integracion interna en `Notion`
4. preparar proyecto Google Cloud para `Sheets` y `Gmail`
5. cargar credenciales en `n8n`
6. probar flujo end-to-end con un lead real

## Valores que necesitamos

### n8n

- URL productiva del webhook de intake
- URL productiva del workflow `galfredev-master-hub`
- URL productiva del workflow `galfredev-twenty-forward` si se mantiene un forwarder legado

Referencia oficial:

- [n8n Webhook node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)

## Twenty

Necesitamos:

- base URL del workspace, por ejemplo `https://app.tudominio.com`
- API key o webhook URL del workflow interno
- modelo final de objetos y campos

Referencias oficiales:

- [Twenty API and webhooks docs](https://docs.twenty.com/developers/api-and-webhooks/api)
- [Twenty workflows docs](https://docs.twenty.com/user-guide/workflow)
- [Setup recomendado en este repo](./TWENTY-WORKFLOW-SETUP.md)

Valores para cargar:

- `TWENTY_BASE_URL`
- `TWENTY_API_KEY`
- `TWENTY_GRAPHQL_URL` opcional
- `TWENTY_WORKFLOW_WEBHOOK_URL` solo si se conserva el forwarder legado

## Notion

Necesitamos:

- token de una integracion interna
- ID de la base donde se van a guardar leads o conocimiento

Referencias oficiales:

- [Notion authentication docs](https://developers.notion.com/docs/authorization)
- [Notion create your integration](https://www.notion.so/profile/integrations)
- [Notion API reference](https://developers.notion.com/reference/intro)

Valores para cargar:

- `NOTION_API_TOKEN`
- `NOTION_LEADS_DATABASE_ID`

## Google Sheets

Necesitamos:

- spreadsheet ID
- nombre de hoja objetivo
- OAuth client o credenciales equivalentes en `n8n`

Referencias oficiales:

- [Google Sheets API quickstart](https://developers.google.com/workspace/sheets/api/quickstart/js)
- [Google Cloud APIs Library - Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
- [n8n Google Sheets integration overview](https://n8n.io/integrations/google-sheets/)

Valores para cargar:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_SHEET_NAME`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Gmail

Necesitamos:

- OAuth client en Google Cloud
- cuenta o bandeja que va a usar el bot para seguimiento
- label sugerido para organizacion interna

Referencias oficiales:

- [Gmail API quickstart](https://developers.google.com/workspace/gmail/api/quickstart/js)
- [Google Cloud APIs Library - Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Auth branding](https://console.cloud.google.com/auth/branding)
- [Google Auth clients](https://console.cloud.google.com/auth/clients)
- [n8n Gmail integration overview](https://n8n.io/integrations/gmail/)

Valor para cargar:

- `GMAIL_INBOX_LABEL`

## Variables de entorno de este repo

Ver:

- [../.env.example](../.env.example)

## Qué conviene pasarme para cerrar la etapa viva

Cuando tengas acceso a los servicios, lo ideal es tener a mano:

- URL productiva de `n8n`
- URL del workflow maestro de `n8n`
- base URL de `Twenty`
- ID de base de `Notion`
- spreadsheet ID de `Sheets`
- client ID y client secret de Google si vas por OAuth con `n8n`

Con eso, ya se puede hacer el cableado final del entorno productivo sin rediseñar el repo.
