#!/usr/local/bin/node --harmony

//
// In the v3 version of the api we have to
//
//  1. query the user for their upload playlist id
//  2. grab the the upload playlist to get the titles and ids
//  3. query each id to get the durations.
//
var 
  fs = require('fs'),
  request = require('request'),
  https = require('https'),
  http = require('http'),
  querystring = require('querystring'),
  url = require('url');

var 
  yt = {
    user: process.argv[2],
    authkey: false,
    playlist: false,
    id: 0,
    base: 'https://www.googleapis.com/youtube/v3/'
  },
  base = 'http://localhost/ghub/ytmix/api/',
  playlist = [],
  playlist_id = 0;

var lib = {
  get: function (location, callback) {
    console.log("Grabbing " + location);
    var buffer = '';

    if(location.length) {
      location = url.parse(location);
    }

    https.get(location, function(res) {

      res.on('data', function(data) { buffer += data });

      res.on('end', function(){
        callback.call(this, JSON.parse(buffer));
      });

    }).on('error', function(e) { console.error(location, e) });
  }
};

// Returns a promise given an end point and 
// set of parameters.
yt.api = function(ep, params) {
  return new Promise(
    function(resolve, reject) {
      // inject the authkey into the request.
      params.key = yt.authkey;

      var qparams = querystring.stringify(params);
      lib.get(yt.base + ep + '?' + qparams, function(res) {
        console.log(res);

        // We presume that there's an 'items' in
        // the object that we are returning.

        // the next function will resolve the next page using
        // the next page token and all the rest of the query params
        res.next = function() {
          if(res.nextPageToken) {
            params.pageToken = res.nextPageToken;
            return yt.api(ep, params);
          } 
          // otherwise, return that we are at the end.
          return new Promise(function(resolve, reject) { resolve(false); });
        }

        resolve(res);
      });
    }
  );
}

// Returns a playlist id for a given user ... 
// defaults uploads
// The demo output I'm working off of (for theIDMMaster)
// is as follows:
//
// {
//  "kind": "youtube#channelListResponse",
//  "etag": "\"oyKLwABI4napfYXnGO8jtXfIsfc/1gOoJe17fPArlXaWZoG8UTAOdMY\"",
//  "pageInfo": {
//   "totalResults": 1,
//   "resultsPerPage": 5
//  },
//  "items": [ 
//   {
//    "kind": "youtube#channel",
//    "etag": "\"oyKLwABI4napfYXnGO8jtXfIsfc/gVT2AesbAfhS15aNTbDpppQEaeY\"",
//    "id": "UChS0SPpEqGMGRim7mebedPg",
//    "contentDetails": {
//     "relatedPlaylists": {
//      "likes": "LLhS0SPpEqGMGRim7mebedPg",
//      "favorites": "FLhS0SPpEqGMGRim7mebedPg",
//      "uploads": "UUhS0SPpEqGMGRim7mebedPg"
//     },
//     "googlePlusUserId": "116087028081258585111"
//    }
//   }
//  ]
// }
//
yt.get_playlist_id = function(user, which /* = 'uploads' */) {
  which = which || 'uploads';

  var mypromise = yt.api('channels', {
    part: 'contentDetails',
    forUsername: user
  }); 
    
  return new Promise(function(resolve, reject) {
    mypromise.then(function(res) {
      resolve( res.items[0].contentDetails.relatedPlaylists[which] );
    });
  });
}

// returns a value in seconds for a given list of ytids
yt.duration = function(ytid_list) {
  var mypromise = yt.api('videos', {
    part: 'contentDetails',
    id: ytid_list.join(',')
  });

  return new Promise(function(resolve, reject) {
    mypromise.then(function(data) {
      var duration_list = [];

      // The duration field is for some inexplicable reason provided in some
      // wonky format like PT7M18S ... brilliant, youtube ... just fabulous.
      data.items.forEach(function(details) {
        var yt_duration, min, sec;

        yt_duration = details.contentDetails.duration;
        yt_duration.match(/PT(\d*)M(\d*)S/);
        duration_list.push([details.id, min * 60 + sec]);
      });

      resolve(duration_list);
    });
  });
}

yt.get_playlist = function(playlist_id, cb) {
  // we can't do generators in a promise ... that
  // would be nice ... oh well.
  //
  // we'll need something that grossly resembles recursion.
  // This is the base "seed" case.
  var 
    payload = [],
    my_promise = yt.api('playlistItems', {
      part: 'snippet',
      playlistId: playlist_id,
      maxResults: 50
    });

  function my_resolve(promise, final_resolve) {
    promise.then(function(data) {
      if(data) {
        // this means we can go further.
        payload = payload.concat(data.items);

        // this gets the next page
        my_resolve(data.next(), final_resolve);
      } else {
        final_resolve(payload);
      }
    });
  }

  return new Promise(function(resolve, reject) {
    my_resolve(my_promise, resolve);
  });
}


function api() {
  var 
    args = Array.prototype.slice.call(arguments),
    cb = args.pop();

  if(args.filter(function(m) {return (m.toString()).search(/\//) > -1}).length) {
    var param = {};

    ["func", "id", "param"].forEach(function(which) {
      if(args) {
        param[which] = args.shift();
      }
    })

    request.post(
      base + 'entry.php', 
      {form: param}, 
      function(error, response, body) {
        if(body == undefined) {
          console.log("Error", 'Make sure that ' + base + ' is accessible');
        } else {
          cb(body);
        }
      }
    )
  } else {
    console.log("url", base + args.join('/'));
    lib.get(base + args.join('/'), cb);
  }
}

api.newentry = function(entry) {
  if (entry.title.constructor != String) {
    entry.title = entry.title[0]['_'];
  }
  yt.id = entry['media:group']['yt:videoid'];

  if (yt.id == undefined) {
    switch(entry.link[0].$.type) {
      case 'text/html':
        yt.id = entry.link[0].$.href.match(/v=([\w-_]*)&/)[1];
        break;

      case 'application/atom+xml':
        yt.id = entry.link[0]['$'].href.split('/').pop();
        break;
    }
  }

  playlist.push([
    parseInt(entry['media:group'][0]['yt:duration'][0]['$']['seconds']),
    entry.title,
    ytid
  ]);
}

api.addEntries = function(xml) {
  var parser = new xml2js.Parser(), ytid;
  playlist = [];

  parser.parseString(xml, function (err, result) {
    if(err) {
      console.log({
        error: err,
        action: "parsing", 
        data: xml.toString()
      });
    }

    if('title' in result) {
      title = result.title;
      if (title.constructor != String) {
        title = title['#'];
      }
      subtitle = result.subtitle;
    }

    result.entry = result.feed.entry;
    if ("forEach" in result.entry) {
      result.entry.forEach(newentry);
    } else {
      newentry(result.entry);
    }
    request.post(base + 'entry.php', {form: {
      func: 'addTracks',
      id: id,
      param: playlist
    }}, function(error, response, body) {
      console.log('addtracks', error, body);

      result.link = result.feed.link;
      next = result.link.filter(function(entry) {
        return entry['$']['rel'] == 'next';
      });

      if(next.length > 0) {
        nextUrl = next[0]['$']['href'];
        read_url(nextUrl);
        console.log({action: "reading", data: nextUrl});
      } 
   });
 });
}

function read_url(urlstr) {
  parsed = url.parse(urlstr);
  parsed.path = parsed.pathname + (parsed.search || "");

  lib.get(parsed, addEntries);
}

function get_playlist() {
  console.log('User: ' + yt.user);

  yt.get_playlist_id(yt.user).then(function(playlist_id) {
    yt.get_playlist(playlist_id).then(function(playlist) {
    });
  });
/*
  api('createid', source, PLAYLIST, function(data) {
    var res = JSON.parse(data);
    id = res.result;

    request.post(
      base + 'entry.php', 
      {form: {
        func: 'update',
        id: res.result,
        name: 'Uploads by ' + process.argv[2]
      }});

    read_url(source);
  });
*/
}

fs.readFile('authkey', 'utf8', function (err, data) {
  if(err) {
    console.log("Unable to find an authkey. Bailing. :-(");
    process.exit();
  }
  yt.authkey = data.replace(/\s/, '');
  get_playlist();
});

