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

## API

All the following can be accessed by doing api/<the thing listed>

### (JSON) help 
List the supported functions

### (JSON) addMethod/id/param 
Playlists keep an audit trail of how items were added.  This audit trail is called a method.
It's a xref table.  Each method has an id.  Examples are things like:

The track was added by...

 * s:artist - ...searching for the string "artist"
 * r:ytid - ...getting videos related to the ytid
 * u:user - ...adding videos by a specific user
 * l:url/string - ...scraping the url, looking for <string>, and inferring a track-listing by surrounding text

### (JSON) addTracks/id/json
Adds tracks to the playlist at <id>.  The json should be youtube ids. This is used in the node.js importer

### (JSON) clear/id
REMOVES ALL TRACKS FROM <id>.  Use with caution.

### (JSON) createid/[source]/[tracks]
If:

 * createid - Will return the next valid playlist id which can then be populated
 * createid/source - Will look for a playlist with the source <source>. If found, will return the id, otherwise, create a new one.
 * createid/source/tracks - Will do the same as above, but if it does not exist, will seed with the JSON of tracks.

### (JSON) delFavorite/user/ytid
Removes the `ytid` from the favorite list of `user`.

### (JSON) generatePreview/id
Generates the 2x2 preview window for playlist <id>. This includes things like track count and duration.  It should be run after updating a tracklist.

### (JSON) get/id
Returns a `select * from playalist where id = <id>` in JSON format.  This includes the methods, blacklists, types, source, and playlist.

### (JSON) getFavorite/user
Gets all the favorite tracks of user <user>.

### (JSON) getPreview/id
Returns the preview for a specific playlist <id> in the following format:

  * tracks: A list of triplets in the format: [track length in seconds, title, ytid]
  * length: The length of the playlist in seconds
  * count: The number of tracks in the playlist

### (newline delimited text) getTracks/id
Returns just the youtube-id entries for a playlist, delimited by a newline.

### (JSON) getUser/[id]
If `id` is specified, returns the db entry for that user, otherwise creates a new one.

### (JSON) query/string
Searches `string` on youtube, returning 20 results. The format returned is as follows:

  * query - the query string searched.
  * vidList - A set of triplets with the keys title, ytid, and length.
  * url - The url used for the query.

### (JSON) recent
A set of previews for recent playlists.

### (JSON) related/id
Returns a set of videos related to youtube-id rid` In the following format:

  * ytid - The ytid used in the query.
  * related - The list of related videos with the keys title and ytid.
  * url - The url used for the query.

### (JSON) remove/id
REMOVES A PLAYLIST from the database with id <id>.

### (JSON) setFavorite/id/ytid
Adds `ytid` to user `id's`favorite list.

### (JSON) POST update {id, tracklist, blacklist, name}
Updates the entry for id.

## TODO

When I add related songs, they don't add directly after the point. This is ultimately confusing.
