#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR="$ROOT/public/sound/mixes"
ANDROID_OUTPUT_DIR="$OUTPUT_DIR/android"

mkdir -p "$OUTPUT_DIR" "$ANDROID_OUTPUT_DIR"

generate_mix_variant() {
  sound=$1
  volumes=$2
  duration=$3
  output_kind=$4
  shift 4

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

  source_duration=$((duration + 2))

  # Build two extra seconds, then circularly crossfade the tail into the
  # beginning. This removes the hard PCM seam before encoding.
  filter="$filters${labels}amix=inputs=$index:duration=longest:normalize=0,atrim=duration=$source_duration,asetpts=PTS-STARTPTS[mix];[mix]asplit=3[headsrc][bodysrc][tailsrc];[headsrc]atrim=0:2,asetpts=PTS-STARTPTS[head];[bodysrc]atrim=2:$duration,asetpts=PTS-STARTPTS[body];[tailsrc]atrim=$duration:$source_duration,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=2:c1=tri:c2=tri[wrap];[wrap][body]concat=n=2:v=0:a=1[out]"

  if [ "$output_kind" = "ios" ]; then
    # shellcheck disable=SC2086
    ffmpeg -hide_banner -loglevel error -y $inputs \
      -filter_complex "$filter" -map "[out]" -c:a aac -b:a 128k \
      -movflags +faststart "$OUTPUT_DIR/$sound.m4a"
  else
    # Static PCM avoids codec priming/padding at the HTML media loop boundary.
    # The 30-second file is small enough to remain cached on mobile devices.
    # shellcheck disable=SC2086
    ffmpeg -hide_banner -loglevel error -y $inputs \
      -filter_complex "$filter" -map "[out]" -c:a pcm_s16le \
      "$ANDROID_OUTPUT_DIR/$sound.wav"
  fi
}

generate_mix_variant rain "0.30,0.16,0.10,0.17,0.09" 30 ios a1 b1 c1 a2 a3
generate_mix_variant wave "0.14,0.00,0.14,0.46,0.46" 30 ios a1 b1 c1 a2 a3
generate_mix_variant river "0.10,0.10,0.10,0.10,0.05" 30 ios a1 b1 c1 a2 a3
generate_mix_variant forest "0.04,0.04,0.14,0.11,0.07" 30 ios a1 b1 c1 a2 a3
generate_mix_variant bonfire "0.37,0.56,0.48" 30 ios a1 b1 c1
generate_mix_variant cave "0.01,0.20,0.16" 30 ios a1 b1 c1

generate_mix_variant rain "0.30,0.16,0.10,0.17,0.09" 30 android a1 b1 c1 a2 a3
generate_mix_variant wave "0.14,0.00,0.14,0.46,0.46" 30 android a1 b1 c1 a2 a3
generate_mix_variant river "0.10,0.10,0.10,0.10,0.05" 30 android a1 b1 c1 a2 a3
generate_mix_variant forest "0.04,0.04,0.14,0.11,0.07" 30 android a1 b1 c1 a2 a3
generate_mix_variant bonfire "0.37,0.56,0.48" 30 android a1 b1 c1
generate_mix_variant cave "0.01,0.20,0.16" 30 android a1 b1 c1

printf 'Generated mobile preset mixes in %s\n' "$OUTPUT_DIR"
