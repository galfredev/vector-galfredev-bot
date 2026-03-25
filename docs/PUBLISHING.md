# Publicacion en GitHub

Esta guia resume como compartir el proyecto sin exponer el runtime real del bot.

## Que si va al repo

- prompts
- memoria del agente
- hooks
- scripts
- workflows
- configuraciones de ejemplo
- documentacion

## Que no va al repo

- `.openclaw/`
- `.codex-stage/`
- `config.env`
- cualquier `openclaw.json` real
- carpetas `credentials/`
- `auth-profiles.json`
- logs, media o leads reales

## Checklist previa al push

1. revisar `git status`
2. confirmar que `.gitignore` excluye runtime y secretos
3. dejar solo archivos de ejemplo en `config/`
4. evitar numeros privados o tokens reales en docs

## Flujo sugerido

```bash
git init
git add .
git status
git commit -m "Initial commit: Vector bot for GalfreDev"
git branch -M main
git remote add origin <TU_REPO_GITHUB>
git push -u origin main
```

## Recomendaciones

- usa `openclaw.example.json`, no `openclaw.json` real
- usa `.env.example`, no `.env` real
- si publicas el repo, asumi que cualquier dato commiteado se vuelve visible
- antes de cada push importante, revisa diff y status
