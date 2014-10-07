See here:

http://9ol.es/yt

## Low Bandwidth Stream Example

You can use [youtube-dl](http://rg3.github.io/youtube-dl/) with a FIFO-pipe and mplayer to play things over a low-bitrate connection like so:

    $ mkfifo audio-pipe

### terminal 1

    $ while [ 0 ]; do mplayer -quiet audio-pipe; done

When you do a -quiet option, then mplayer doesn't send as many updates
to the terminal.  For me, it actually adds about 45 minutes to my battery
life (~11hr 30 -> ~12hr 15) when I have this on - you should see your X
resources in top (or htop) drop a few percentage points with it - regardless of whether you have it iconified or not.

### terminal 2

    $ curl localhost/ytmix/api/gettracks/(id) \ 
      | shuf \
      | xargs -n 1 youtube-dl -q -o audio-pipe -f 140 --

format 140 is an audio-only format that about 95% or so of youtube videos support.

## API

All the following can be accessed by doing a GET (unless otherwise specified) to `api/[the thing listed]`.
The JSON results return 

    {status: bool, result: json }

Where `status` is either True or False, depending on whether the call succeeded or failed. 
If the call fails, then the result will hold an error string.

### (JSON) help 
List the supported functions (enumerated below).

### (JSON) addMethod/id/method
Playlists keep an audit trail of how videos were added.  This audit trail is called a method.
It's a xref table.  Each method has an id.  Examples are things like:

The track was added by...

 * `s:artist` - ...searching for the string "artist"
 * `r:ytid` - ...getting videos related to the ytid
 * `u:user` - ...adding videos by a specific user
 * `l:url/string` - ...scraping the url, looking for <string>, and inferring a track-listing by surrounding text

The result is an id to refer to the method by.  So 

    GET /api/addMethod/123/s:someone

Will return an id to refer to "s:someone" by.

### (JSON) addTracks/id/json
Adds tracks to the playlist at `id`.  The JSON should be an array of YouTube ids. This is used in the node.js importer

### (JSON) clear/id
REMOVES ALL TRACKS FROM `id`.  Use with Caution!

### (JSON) createid/[source]/[tracks]
If:

 * `createid` - Will return the next valid playlist id which can be populated.
 * `createid/source` - Will look for a playlist with the source `source`. If found, will return the id, otherwise, create a new one.
 * `createid/source/tracks` - Will do the same as above, but if the source does not exist, will seed a new playlist with the JSON of tracks.

### (JSON) delFavorite/user/ytid
Removes the `ytid` from the favorite list of `user`.

### (JSON) generatePreview/id
Generates the 2x2 preview window for playlist `id`. This includes things like track count and duration.  It should be run after updating a tracklist.

### (JSON) get/id
Returns a `select * from playalist where id = <id>` in JSON format.  This includes the `methods`, `blacklists` (of removed tracks), `types`, `source`, and `playlist`.

### (JSON) getFavorite/user
Gets all the favorite tracks of user `user`.

### (JSON) getPreview/id
Returns the preview for a specific playlist `id` in the following format:

  * `tracks`: A list of triplets in the format: [track length in seconds, title, ytid]
  * `length`: The length of the playlist in seconds.
  * `count`: The number of tracks in the playlist.

### (newline delimited text) getTracks/id
Returns just the youtube-id entries for a playlist, delimited by a newline.

### (JSON) getUser/[id]
If `id` is specified, returns the db entry for that user, otherwise creates a new one.

### (JSON) query/string
Searches `string` on YouTube, returning 20 results. The format returned is as follows:

  * `query` - the query string searched.
  * `vidList` - An array of objects with the keys `title`, `ytid`, and `length`.
  * `url` - The url used for the query.

### (JSON) recent
A set of previews for recent playlists.

### (JSON) related/id
Returns a set of videos related to YouTube-id `id` In the following format:

  * `ytid` - The ytid used in the query.
  * `related` - An array of related video objects with the keys `title` and `ytid`.
  * `url` - The url used for the query.

### (JSON) remove/id
REMOVES A PLAYLIST from the database with id `id`.

### (JSON) setFavorite/id/ytid
Adds `ytid` to user `id's`favorite list.

### (JSON) POST update {id, tracklist, blacklist, name}
Updates the entry for id.

## TODO

When I add related songs, they don't add directly after the point. This is ultimately confusing.
