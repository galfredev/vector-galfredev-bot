#!/usr/bin/env bash
set -euo pipefail

MEDIA_PATH="${1:?usage: openclaw-whisper-stt <audio-file>}"
MODEL_NAME="${OPENCLAW_WHISPER_MODEL:-base}"
LANG_NAME="${OPENCLAW_WHISPER_LANG:-auto}"

MODELS_DIR="$HOME/.cache/whisper"
WHISPER_CLI="$HOME/.local/bin/whisper-cli"
MODEL_PATH="$MODELS_DIR/ggml-$MODEL_NAME.bin"

[ -x "$WHISPER_CLI" ] || { echo "whisper-cli not found: $WHISPER_CLI" >&2; exit 2; }
[ -f "$MODEL_PATH" ] || { echo "Model not found: $MODEL_PATH" >&2; exit 3; }
[ -f "$MEDIA_PATH" ] || { echo "Audio file not found: $MEDIA_PATH" >&2; exit 4; }

TMP_WAV=""
cleanup() {
  if [ -n "$TMP_WAV" ] && [ -f "$TMP_WAV" ]; then
    rm -f "$TMP_WAV"
  fi
}
trap cleanup EXIT

INPUT="$MEDIA_PATH"
case "${MEDIA_PATH,,}" in
  *.ogg|*.opus|*.m4a|*.mp3|*.flac|*.webm)
    TMP_WAV="$(mktemp -t openclaw-whisper-XXXXXX.wav)"
    ffmpeg -hide_banner -loglevel error -y -i "$MEDIA_PATH" -ar 16000 -ac 1 -c:a pcm_s16le "$TMP_WAV"
    INPUT="$TMP_WAV"
    ;;
esac

exec "$WHISPER_CLI" -m "$MODEL_PATH" -l "$LANG_NAME" -f "$INPUT" -nt
