# Publicacion en GitHub

Este repo ya esta preparado para publicarse sin subir secretos.

## Antes de hacer push

Revisa que no se agreguen estos paths:

- `.openclaw/`
- `.codex-stage/`
- `config.env`
- cualquier `openclaw.json` real
- cualquier carpeta `credentials/`
- logs, media o leads reales

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

## Si vas a compartirlo publicamente

- deja solo `config/openclaw.example.json`
- deja `.env.example`
- mantene fuera del repo cualquier numero privado, token o sesion real
