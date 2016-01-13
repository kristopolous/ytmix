This tool (in development since 2008!) is for quickly navigating and listening to large ad-hoc playlists from youtube:
<img src=http://i.imgur.com/Gr17F7d.png>

There's special attention for looking for and adding:
 
 * similar videos
 * videos by the same uploader
 * videos by the same "group"

Where similar videos and group videos have a number of heuristic tests on them to keep the crap out.

This isn't a fly-by-night project.  I've been using it consistently for 8 years - constantly updating and refining it.

Demo? See here:

http://9ol.es/yt

## Creating a new playlist

The quickest way to create a new playlist is to use the `import/parse.js` script which uses the YouTube data api v3 in order to create a list
of the uploads of a specified user.  Unfortunately, due to v3 bullshit, You need to get an auth-key to send off the requests. 

### * sigh * obtaining an auth key

 1. Go to [registering an application](https://developers.google.com/youtube/registering_an_application?hl=en).
 2. In the "developer console" you need to click on a few things. 
 
 <img src=http://i.imgur.com/CD4ttnN.png>

When you finish step 3 a dialog will pop up:

<img src=http://i.imgur.com/wSvcj7L.png>

After clicking you'll be directed to this form.  Just leave everything blank.

 <img src=http://i.imgur.com/G8C4q56.png>

After clicking you'll get a spinner and be asked to wait a few seconds.  
You'll eventually get something that looks like this:

 <img src=http://i.imgur.com/RI9TvVF.png>

This string of letters and numbers, we'll call the "auth key" has be in a file located at `secrets/authkey`.  In order to create the file,
after you've pulled down the code, go to the git root directory and do the following:

    (git root)$ echo "Your 'auth key'" > secrets/authkey

That means that the file contains just your key, no other code, format, or syntax ... it's the simplest format imaginable.

*phew* now you can import.

### Importing

An example would be

    $ import/parse.js TheIDMMaster
    User: TheIDMMaster
     > ...s?part=contentDetails&forUsername=TheIDMMaster&key=super-secret << Find out the playlistid of the user
     > ...ylistId=UUhS0SPpEqGMGRim7mebedPg&maxResults=50&key=super-secret << Get the playlist
     > ...e/v3/videos?part=contentDetails&id=-U8rJlH_1y8&key=super-secret << Find the duration of a track found
     +++ adding 1
     > ...qGMGRim7mebedPg&maxResults=50&key=super-secret&pageToken=CDIQAA << Get the next page ...
     > ...qGMGRim7mebedPg&maxResults=50&key=super-secret&pageToken=CGQQAA
     > ...GMGRim7mebedPg&maxResults=50&key=super-secret&pageToken=CJYBEAA
     > ...GMGRim7mebedPg&maxResults=50&key=super-secret&pageToken=CMgBEAA
    ...
    $

There's a "quota" system on youtube (and each of these requests have a "cost").  I'm pretty conscious of this since I use this thing every day.  I try my hardest to be as thrifty as feasible.

If you want to avoid all the quota and key nonsense, there's a dump `db/mysql-dump.db.lzma` that is occasionally updated.  Just do 

    mysql -uroot yt < mysql-dump.db

As far as the mysql credentials they are in [lib/db.php](https://github.com/kristopolous/ytmix/blob/master/lib/db.php).  Oh dear, now you know my localhost doesn't have a password for root.  Woe is me.

There's two tables ... one that has the playlist and one that has a normalized set of the tracks.  The tracks table is used for 

 * importing playlists so not to incur an api cost for getting the duration (thanks youtube!)
 * tracking whether a track is 'active' or pulled for youtube
 * storing when the track was added to the system
 * storing the last time it was listened to
 * having an internal view count of them.
 * knowing how much of the track was listened to as a metric of whether I actually liked the content or unfortunately just ran into it frequently.

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

There's also an "extension" support for the api call which, if the result is an array, will return it as a list with newlines,
appropriate for scripting.  For instance, you could do

    api/names

to get all the names of the playlists as json or

    api/names.txt

to get them as text.  Then if you want to update the playlists you could do

    curl localhos/api/names.txt | xargs -n 1 import/parse.js


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

## Miscellaneous hacks

There's a function for displaying the most popular artists in a `console.table` using the `stats()` function (located in Utils.js).  The implementation is a pretty good example of my [db.js](https://github.com/kristopolous/db.js/tree/master) being utilized. Here's an example output:

<img src=http://i.imgur.com/ZJevMXo.png>
