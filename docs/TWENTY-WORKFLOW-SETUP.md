# Twenty Workflow Setup

Esta guia define la forma recomendada de conectar `n8n` con `Twenty` sin depender de mutaciones manuales o workflows visuales fragiles dentro del CRM.

## Enfoque recomendado

Usar el workflow maestro de `n8n` para escribir directo en `Twenty` via GraphQL.

Ventajas:

- el contrato queda visible y versionado en este repo
- los errores se ven en `n8n` y no quedan escondidos en un builder externo
- el flujo de `People`, `Companies` y `Opportunities` queda reproducible
- evita depender de chips/variables rotas en el workflow visual de `Twenty`

## Flujo

1. Vector emite el payload enriquecido.
2. `n8n` recibe el evento en `galfredev-master-hub.workflow.json`.
3. `n8n` crea o registra `Company`, `Person` y `Opportunity` en `Twenty` via GraphQL.
4. `n8n` agrega la fila operativa en `Google Sheets`.
5. `n8n` crea el registro complementario en `Notion`.
6. `n8n` manda la alerta interna por `Gmail`.

## Workflow canonico

- [workflows/n8n/galfredev-master-hub.workflow.json](../workflows/n8n/galfredev-master-hub.workflow.json)

## Variables requeridas en n8n

- `TWENTY_BASE_URL`
- `TWENTY_API_KEY`

Opcional:

- `TWENTY_GRAPHQL_URL`

Si `TWENTY_GRAPHQL_URL` no esta definido, el workflow deriva automaticamente `{{TWENTY_BASE_URL}}/graphql`.

## Mapeo actual a Twenty

### Company

- `name` <- `normalized.company.displayName`

### Person

- `name.firstName` <- `normalized.person.name`
- `companyId` <- id devuelto por `createCompany`

### Opportunity

- `name` <- `normalized.opportunity.title`
- `stage` <- `SCREENING`
- `companyId` <- id devuelto por `createCompany`
- `pointOfContactId` <- id devuelto por `createPerson`

## Campos que conviene ampliar despues

Cuando el schema del workspace este mas estable, conviene sumar:

- telefono del lead
- link directo al chat
- resumen comercial
- proceso actual y deseado
- nota fuente completa
- tareas o reminders

## Workflow legado opcional

Se conserva el forwarder:

- [workflows/n8n/galfredev-twenty-forward.workflow.json](../workflows/n8n/galfredev-twenty-forward.workflow.json)

Solo conviene usarlo si todavia queres reenviar `normalized` a un workflow interno de `Twenty`.

Variables relacionadas:

- `TWENTY_WORKFLOW_WEBHOOK_URL`

Ese camino queda como compatibilidad/migracion, no como camino canonico actual.
