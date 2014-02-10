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
      | xargs youtube-dl -o audio-pipe -f 140

format 140 is an audio-only format that about 95% or so of youtube videos support.

## TODO

When I have a search result, I can't move forward and backward right

When I add related songs, they don't add directly after the point. This is ultimately confusing.

## The idea

 * Realtime, broadcast style playlists where 
   * any user can make their own based on third party sites (with agressive suggestions)
   * any user can listen to anyone elses 

 * Integration with hosted mp3s and soundcloud, etc, make it a tool that can leverage the entirety of the online space to create new works.  
 * It's fundamentally an aggregated web idea ... a.k.a repost, reblog, re-xyz

## notes

 * social is about voyeurism/exhibitionism
 * it's about being a stalker and a showoff in a controllable manner
 * people want to experience by proxy other peoples reality
 * mobile is all that will matter and it can be monetized easier
 * people don't care about brand until you care about experience
 * notion of a cyber party or game.
 * people are willing to socialize anonymously if you don't scare them.

## models for success

 * cam4/stickam for the realtime/voyeur/exhibition
 * drawsomething has the rough edges asynchronously
   * also, it doesn't export primordial things but makes up a trivial to understand arbitrary game
   * it has a non-verbal non-text thorough communication channel in realtime. That's really important.
 * reddit/digg/slashdot/cam4 again exploit of ego-gaming. It's about the ego and it's also a gammification giving a mostly false sense of accomplishment and making it ultimately temporal.
 * 4chan for epitomizing Warhold "15 seconds of fame". Always remains fresh, novel, but generally still predictable.
 * balance what people expect with what people will accept.
 * back to 4chan, relative voluntary anonymity through personas (tumblr does this a bit).
 * tumblrs successful implementation of RSS like systems makes it a daily venture.  Staying fresh and unknown is critical.

## Where people fail

 * To filter what you have seen (reddit does this as an option)
 * eternal september
   * To combat (reddit somewhat does this with subreddits, wikipedia with formalities)
   * To leverage (facebook, groupon do this).
   * like an rpg, to have fresh rewards for return customers but not permit these to disuade first time visitors.
