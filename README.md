See here:

http://9ol.es/ytwatch1

## Low Bandwidth Stream Example

You can use [youtube-dl](http://rg3.github.io/youtube-dl/) with a FIFO-pipe and mplayer to play things over a low-bitrate connection like so:

    $ mkfifo audio-pipe

### terminal 1

    $ while [ 0 ]; do mplayer audio-pipe; done

### terminal 2

    $ curl localhost/ytmix/api/gettracks/(id) \ 
      | shuf \
      | xargs -n 1 youtube-dl -o audio-pipe -f 140

format 140 is an audio-only format that about 95% or so of youtube videos support.

## TODO

When I add related songs, they don't add directly after the point. This is ultimately confusing.
