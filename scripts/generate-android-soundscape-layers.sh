#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR="$ROOT/public/sound/mixes/android/layers"

generate_layers() {
  sound=$1
  shift

  mkdir -p "$OUTPUT_DIR/$sound"

  for layer in "$@"; do
    ffmpeg -hide_banner -loglevel error -y \
      -i "$ROOT/public/sound/$sound/v1/$layer.wav" \
      -c:a libopus -b:a 96k -vbr on -compression_level 10 \
      "$OUTPUT_DIR/$sound/$layer.webm"
  done
}

generate_layers rain a1 b1 c1 a2 a3
generate_layers wave a1 b1 c1 a2 a3
generate_layers river a1 b1 c1 a2 a3
generate_layers forest a1 b1 c1 a2 a3
generate_layers bonfire a1 b1 c1
generate_layers cave a1 b1 c1

printf 'Generated Android soundscape layers in %s\n' "$OUTPUT_DIR"
