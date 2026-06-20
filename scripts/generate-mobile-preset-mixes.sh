#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR="$ROOT/public/sound/mixes"

mkdir -p "$OUTPUT_DIR"

generate_mix() {
  sound=$1
  volumes=$2
  shift 2

  inputs=""
  filters=""
  index=0

  for layer in "$@"; do
    inputs="$inputs -stream_loop -1 -i $ROOT/public/sound/$sound/v1/$layer.wav"
    volume=$(printf '%s\n' "$volumes" | cut -d, -f$((index + 1)))
    filters="$filters[$index:a]volume=$volume[v$index];"
    index=$((index + 1))
  done

  labels=""
  i=0
  while [ "$i" -lt "$index" ]; do
    labels="$labels[v$i]"
    i=$((i + 1))
  done

  # Build 32 seconds, then circularly crossfade the last two seconds into
  # the first two. The resulting 30-second file loops without a hard seam.
  filter="$filters${labels}amix=inputs=$index:duration=longest:normalize=0,atrim=duration=32,asetpts=PTS-STARTPTS[mix];[mix]asplit=3[headsrc][bodysrc][tailsrc];[headsrc]atrim=0:2,asetpts=PTS-STARTPTS[head];[bodysrc]atrim=2:30,asetpts=PTS-STARTPTS[body];[tailsrc]atrim=30:32,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=2:c1=tri:c2=tri[wrap];[wrap][body]concat=n=2:v=0:a=1[out]"

  # shellcheck disable=SC2086
  ffmpeg -hide_banner -loglevel error -y $inputs \
    -filter_complex "$filter" -map "[out]" -c:a aac -b:a 128k \
    -movflags +faststart "$OUTPUT_DIR/$sound.m4a"
}

generate_mix rain "0.30,0.16,0.10,0.17,0.09" a1 b1 c1 a2 a3
generate_mix wave "0.14,0.00,0.14,0.46,0.46" a1 b1 c1 a2 a3
generate_mix river "0.10,0.10,0.10,0.10,0.05" a1 b1 c1 a2 a3
generate_mix forest "0.04,0.04,0.14,0.11,0.07" a1 b1 c1 a2 a3
generate_mix bonfire "0.37,0.56,0.48" a1 b1 c1
generate_mix cave "0.01,0.20,0.16" a1 b1 c1

printf 'Generated mobile preset mixes in %s\n' "$OUTPUT_DIR"
