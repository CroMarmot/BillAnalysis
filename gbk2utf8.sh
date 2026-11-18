#!/bin/sh
dir=$(dirname "$1")
base=$(basename "$1")
iconv -f gbk -t utf8 -o "$dir/utf8_$base" "$1"
