#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# openclaw-groq-stt.sh — Transcripción de audio con fallback
#
# Cadena: Groq (primary) → Groq tras convertir a wav → OpenAI (fallback).
# Saca la carga de Whisper local del CPU del VPS y evita que una caída de
# Groq deje las notas de voz sin procesar (Groq era un punto único de falla).
#
# Contrato: recibe la ruta del audio como $1 y escribe SOLO el texto a stdout.
#
# Requiere: GROQ_API_KEY. Opcional (fallback): OPENAI_API_KEY.
# Opcionales:
#   OPENCLAW_GROQ_STT_MODEL   (default: whisper-large-v3-turbo)
#   OPENCLAW_OPENAI_STT_MODEL (default: whisper-1)
#   OPENCLAW_STT_LANG         (default: es)
# ─────────────────────────────────────────────────────────────
set -uo pipefail

MEDIA_PATH="${1:?usage: openclaw-groq-stt <audio-file>}"
GROQ_MODEL="${OPENCLAW_GROQ_STT_MODEL:-whisper-large-v3-turbo}"
OPENAI_MODEL="${OPENCLAW_OPENAI_STT_MODEL:-whisper-1}"
LANG="${OPENCLAW_STT_LANG:-es}"

[ -f "$MEDIA_PATH" ] || { echo "Audio no encontrado: $MEDIA_PATH" >&2; exit 4; }

TMP_WAV=""
cleanup() { [ -n "$TMP_WAV" ] && [ -f "$TMP_WAV" ] && rm -f "$TMP_WAV"; }
trap cleanup EXIT

groq_transcribe() {
  local file="$1"
  [ -n "${GROQ_API_KEY:-}" ] || return 1
  curl -sS -m 60 https://api.groq.com/openai/v1/audio/transcriptions \
    -H "Authorization: Bearer ${GROQ_API_KEY}" \
    -F "file=@${file}" -F "model=${GROQ_MODEL}" \
    -F "language=${LANG}" -F "temperature=0" -F "response_format=text" 2>/dev/null
}

openai_transcribe() {
  local file="$1"
  [ -n "${OPENAI_API_KEY:-}" ] || return 1
  curl -sS -m 60 https://api.openai.com/v1/audio/transcriptions \
    -H "Authorization: Bearer ${OPENAI_API_KEY}" \
    -F "file=@${file}" -F "model=${OPENAI_MODEL}" \
    -F "language=${LANG}" -F "temperature=0" -F "response_format=text" 2>/dev/null
}

# 1) Groq directo (WhatsApp manda ogg/opus, que Groq acepta)
resp="$(groq_transcribe "$MEDIA_PATH")" || resp=""

# 2) Si falló y hay ffmpeg, convertir a wav 16k mono y reintentar Groq
if [ -z "${resp// }" ] && command -v ffmpeg >/dev/null 2>&1; then
  TMP_WAV="$(mktemp -t openclaw-stt-XXXXXX.wav)"
  if ffmpeg -hide_banner -loglevel error -y -i "$MEDIA_PATH" -ar 16000 -ac 1 -c:a pcm_s16le "$TMP_WAV" 2>/dev/null; then
    resp="$(groq_transcribe "$TMP_WAV")" || resp=""
  fi
fi

# 3) Fallback OpenAI (si Groq caído o sin key)
if [ -z "${resp// }" ]; then
  resp="$(openai_transcribe "${TMP_WAV:-$MEDIA_PATH}")" || resp=""
fi

[ -n "${resp// }" ] || { echo "STT no devolvió texto (Groq y OpenAI fallaron)" >&2; exit 5; }
printf '%s\n' "$resp"
