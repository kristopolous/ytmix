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
  playlist_id = 0,
  title = "(no title)",
  subtitle;

var lib = {
  get: function (location, callback) {
    var buffer = '';

    if(location.length) {
      location = url.parse(location);
    }

    http.get(location, function(res) {

      res.on('data', (d) => buffer += data);

      res.on('end', function(){
        callback.call(this, buffer);
      });

    }).on('error', (e) => console.error(location, e) );
  }
};

// Returns a promise given an end point and 
// set of parameters.
yt.api = function(ep, params) {
  var promise_to_return = new Promise(
    function(resolve, reject) {
      var qparams = querystring.stringify(params);
      lib.get(ep + '?' + qparams, function(res) {

        // We presume that there's an 'items' in
        // the object that we are returning.
        resolve(res.items);
      });
    }
  );

  return promise_to_return;
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
//  "items": [ << this is returne by the api
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
yt.upload_id = function(user, which) {
  which = which || 'uploads';

  var mypromise = yt.api('channels', {
    part: 'contentDetails',
    forUsername: user
  }); 
    
  return new Promise(function(resolve, reject) {
    mypromise.then(function(data) {
      resolve( data.contentDetails.relatedPlaylists[which] );
    });
  });
}

// returns a value in seconds for a given list of ytids
yt.duration = function(ytid_list) {
  var mypromise = yt.api('videos', {
    part: 'contentDetails',
    id: ytid_list.join(',')
  }), 

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

yt.playlist = function(playlist_id, cb) {
  return yt.api('playlistItems', {
    part: 'snippet',
    playlistId: playlist_id
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
          console.log("Error", 'Make sure that ' + base + 'is accessible');
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

function addEntries(xml) {
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

auth_resolve = new Promise(function(resolve, reject) {
  fs.readFile('authkey', 'utf8', function (err,data) {
    if(err) {
      console.log("Unable to find an authkey. Bailing. :-(");
      reject(false);
      process.exit();
    }
    authkey = data.replace(/\s/, '');
    resolve(authkey);
  })
});

auth_resolve.then(function(auth_key) {
  console.log('Reading from ' + source);

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
});
