# Contributing

Gracias por revisar o mejorar este proyecto.

## Alcance

Este repo representa la parte versionable del bot, no el runtime real.

Se aceptan mejoras sobre:

- prompts
- docs
- hooks
- scripts
- workflow de CRM
- ejemplos de configuracion

## Antes de proponer cambios

- manten el foco comercial del bot
- no subas secretos ni estado local
- evita romper compatibilidad con OpenClaw
- documenta cualquier cambio de comportamiento

## Reglas practicas

1. No commitear credenciales ni sesiones.
2. No commitear `openclaw.json` real.
3. Mantener `config/openclaw.example.json` como ejemplo saneado.
4. Si cambias el comportamiento del agente, actualiza tambien `workspace/`.
5. Si cambias deploy o setup, actualiza `docs/`.
6. Si cambias hooks o workflows, corre las validaciones locales.

## Checklist antes de abrir un cambio

- revisar `git status`
- correr `npm run check`
- correr una prueba basica del flujo comercial
- validar que el lead siga cerrando bien
- validar que `.gitignore` no se rompio
