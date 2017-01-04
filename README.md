This tool (in development since 2008!) is for quickly navigating and listening to large ad-hoc playlists from youtube:
<img src=http://i.imgur.com/Gr17F7d.png>

Also, as of April 2016, a large effort is being made to have a mobile-friendly version. Here's two screenshots from April 29, 2016:

<img src="http://i.imgur.com/TFGj0cD.png">
<img src="http://i.imgur.com/1bFQ1Js.png">


There's special attention for looking for and adding:
 
 * similar videos
 * videos by the same uploader
 * videos by the same "group"

Where similar videos and group videos have a number of heuristic tests on them to keep the crap out.

This isn't a fly-by-night project.  I've been using it consistently for 8 years - constantly updating and refining it. It's been through many iterations over the years and done many UI pivots.

The space for long-tail thematic grouping of music has certainly grown since my inception, but the solutions don't cut it because:

 * They require too much effort on my part to curate and follow hundreds of people, then unfollow ones that post junk
 * If things are 'automated', they aren't very good at guessing how I listen to music (I focus on things I haven't heard).
 * Many systems rightly weigh a songs popularity as part of the likelihood that I want to listen to it.  This is wrong.  If it's popular, I've already heard it and moved on.
 * These for-profit commercial services end up pitching promoted artists through some kind of revenue model in a way that disrupts the customer experience.

This software may not be for you. That's fine. Widespread general utility wasn't on my roadmap. 

Demo? See here:

http://9ol.es/yt

### Installation

#### PHP 7 dependencies
I ran into an issue (2017-01-04) that required the `php7.0-mbstring` apt package to be installed so be on the lookout.

### News
Recently (2016), I normalized the database to have a table of tracks.  This table keeps track of whether a video can be played or not, how many times its been played and the total time listened throughout those plays.  It also keeps track of the uploader and channel.  

The eventual goal is to use this as data to discover more content.  There's a number of floating dimensions in this analysis which can lead to bad inferences, but the general idea is that if content is frequented often, listened to almost completely, and by the same uploader, then more content from that uploader would probably be good.

The fundamental flaw in this analysis is the volume versus curation problem with any follow system.  Pretend Alice and Bob upload videos.  You like 100 of Alice's videos and 10 of Bob's.  

The question is given a video you haven't seen `Y` from user `X`, what is the qualitative likelihood `p` that you will like it?

If both Alice and Bob upload a video say, tomorrow, which one are you more likely to enjoy?

The answer is actually indeterminant without additional info because total volume of assets hasn't been looked at.  

If we add an additional field, say "number of videos uploaded":

            Liked   Uploaded  probability
    Alice     100      10000  0.01
    Bob        10         20  0.50

All of a sudden Bob looks like a good candidate.  

But wait, there's more! We haven't looked at individual exposure yet. Let's say I haven't seen all 10k uploads from Alice or 20 from Bob.

            Liked   Seen   Uploaded  probability
    Alice     100    100      10000  1.00
    Bob        10     20         20  0.50

Now things have swapped yet again! And this only takes into consideration binary classification I have to choose whether I think something is the greatest thing ever or completely intolerable.  This classifier doesn't accomodate for or differentiate the in-between.

As I've suggested above, using the opinion of others *collectively in aggregate* is not a useful indicator otherwise I'd just hit up the local clearchannel station KRAP and listen to that all day. What most people like is total garbage and nonsense. If that metric is to be used at all, it's to discard anything that's past a certain popularity threshold. 

For a while that was done as youtube would inject the latest garbage from some teen pop sensation in videos related to say, john coltrane.  Ah yes, youtube, that's right; it's John Coltrane, Pharoah Sanders, Miles Davis, and Ke$ha.  That's totally sensible. 

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

    $ node parse.js tangramten24
    User: tangramten24
     > createid{"id":"tangramten24"}
     > update{"id":625,"name":"Uploads by tangramten24"}
     > https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forUsername=tangramten24&key=AIzaSyD3cxApQz9auBO79CAy
     > https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=UUQpIIWe6P3FN3G_Wx3ErrQw&key=A
     > tracks{"id":"4WvAjndDs48,uqOXPuKLOUo,jt-HGIdRIv4,SRP78mA021I,CLi_m7Bwf1g,gk4OU6BJMAc,vP7-cNi4ZVc,mLw94okMaY0,wWCMZH4Hhts
     > https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=4WvAjndDs48%2CuqOXPuKLOUo%2Cjt-HGIdRIv4%2CSRP78mA021
     +++ adding 50
     > addTracks{"id":625,"param":[[786,"Re-VoLt - MAGNETIC STORMS ON THE EVENT HORIZON.","4WvAjndDs48"],[232,"TANGERINE DREAM 
     > https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=UUQpIIWe6P3FN3G_Wx3ErrQw&key=A
     > tracks{"id":"EDDf34fqugs,R-S4916XWGA,CYqIA2sVgjA,YOBIc0eDXVI,P5QdLxxOWmI,O0HM-67IgkQ,FxmCNoUUjBg,JEj5lEEGvqk,9yRxR0bkz6I
     > https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=EDDf34fqugs%2CR-S4916XWGA%2CCYqIA2sVgjA%2CYOBIc0eDXV
     +++ adding 50
     > addTracks{"id":625,"param":[[642,"KLAUS SCHULZE - FRANK HERBERT.","EDDf34fqugs"],[445,"TANGERINE DREAM - VERNAL RAPTURE.
    ...
    $

There's a "quota" system on youtube (and each of these requests have a "cost").  I'm pretty conscious of this since I use this thing every day.  I try my hardest to be as thrifty as feasible.

If you want to avoid all the quota and key nonsense, there's a dump `db/mysql-dump.db.lzma` that is occasionally updated.  Just do 

    mysql -uroot yt < mysql-dump.db

As far as the mysql credentials they are in [secrets/db.ini](https://github.com/kristopolous/ytmix/blob/master/secrets/db.ini).  Oh dear, now you know my localhost doesn't have a password for root.  Woe is me. Also, there's some notes in the [parent directory's readme](https://github.com/kristopolous/ytmix/blob/master/secrets).

There's two tables ... one that has the playlist and one that has a normalized set of the tracks.  The tracks table is used for 

 * importing playlists so not to incur an api cost for getting the duration (thanks youtube!)
 * tracking whether a track is 'active' or pulled for youtube
 * storing when the track was added to the system
 * storing the last time it was listened to
 * having an internal view count of them.
 * knowing how much of the track was listened to as a metric of whether I actually liked the content or unfortunately just ran into it frequently.

> Note: Youtube also has Google+ accounts which don't have any YouTube user ids... this is fine! Just pass the channel id.  For Example, the [Berlin School and Ambient](https://www.youtube.com/channel/UCqOkOS00m2lRud_sJSa96Mw) channel isn't associated with a youtube id.  You can pass the channel id, in this case `UCqOkOS00m2lRud_sJSa96Mw`, and the tool will figure it out and do the import.

## Low Bandwidth Streaming

Edit: There's a tool now at `tools/shell-listen.sh` that accomplishes this since recent (2016-09-30) FF dev versions have been eating up lots of CPU for the HTML5 yt videos.

You can use [youtube-dl](http://rg3.github.io/youtube-dl/) with a FIFO-pipe and mplayer to play things over a low-bitrate connection like so:

    $ mkfifo audio-pipe

### terminal 1

    $ while [ 0 ]; do mplayer -quiet audio-pipe; done

When you do a -quiet option, then mplayer doesn't send as many updates
to the terminal.  For me, it actually adds about 45 minutes to my battery
life (~11hr 30 -> ~12hr 15) when I have this on - you should see your X
resources in top (or htop) drop a few percentage points with it - regardless of whether you have it iconified or not.

### terminal 2

    $ curl localhost/ytmix/api/gettracks.txt/(id)[/query] \ 
      | shuf \
      | xargs -n 1 youtube-dl -q -o audio-pipe -f 140 --

format 140 is an audio-only format.

Also you can put an optional query on the end of it to get just those tracks that match it.

## Offline Listening

There's a much more obvious thing you can do to listen to your playlist offline.  Again, using xargs and its parallel magic...

    $ curl localhost/ytmix/api/gettracks.txt/(id) | xargs -n 1 -P 8 youtube-dl -q -f 140 --

Can allow you to go off and get a large assortment of m4as.

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

### (JSON) tracks/{id}
Returns a list of the tracks either system wide or specific to a playlist id.

### (JSON) ytinfo/ytid{,ytid{,ytid..}}/{sections}
An in-service way to look up snippet, details, statistics, etc. from a list of ytids

## Miscellaneous hacks

There's a function for displaying the most popular artists in a `console.table` using the `stats()` function (located in Utils.js).  The implementation is a pretty good example of my [db.js](https://github.com/kristopolous/db.js/tree/master) being utilized. Here's an example output:

<img src=http://i.imgur.com/ZJevMXo.png>
