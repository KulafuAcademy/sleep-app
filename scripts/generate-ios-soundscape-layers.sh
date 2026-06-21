#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR="$ROOT/public/sound/mixes/ios/layers"

generate_layer() {
  sound=$1
  layer=$2
  volume=$3

  mkdir -p "$OUTPUT_DIR/$sound"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$ROOT/public/sound/$sound/v1/$layer.wav" \
    -map 0:a:0 -vn -af "volume=$volume" \
    -c:a aac -b:a 128k -movflags +faststart \
    "$OUTPUT_DIR/$sound/$layer.m4a"
}

generate_layer rain a1 0.150
generate_layer rain b1 0.080
generate_layer rain c1 0.050
generate_layer rain a2 0.085
generate_layer rain a3 0.045

generate_layer wave a1 0.070
generate_layer wave b1 0.000
generate_layer wave c1 0.070
generate_layer wave a2 0.230
generate_layer wave a3 0.230

generate_layer river a1 0.050
generate_layer river b1 0.050
generate_layer river c1 0.050
generate_layer river a2 0.050
generate_layer river a3 0.025

generate_layer forest a1 0.020
generate_layer forest b1 0.020
generate_layer forest c1 0.070
generate_layer forest a2 0.055
generate_layer forest a3 0.035

generate_layer bonfire a1 0.185
generate_layer bonfire b1 0.280
generate_layer bonfire c1 0.240

generate_layer cave a1 0.005
generate_layer cave b1 0.100
generate_layer cave c1 0.080

printf 'Generated iOS soundscape layers in %s\n' "$OUTPUT_DIR"
