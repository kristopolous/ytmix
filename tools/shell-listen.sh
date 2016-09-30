#!/bin/sh

pipe=/tmp/audio-pipe
id=$1
[ -e $pipe ] && rm -f $pipe
mkfifo $pipe

{
  while [ 0 ]; do
    mpv -quiet $pipe
  done
}&

curl -s localhost/ghub/ytmix/api/gettracks.txt/$id | shuf | xargs -n 1 youtube-dl -q -o $pipe -f 140 --


