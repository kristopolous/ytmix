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
    id: 0,
    base: 'https://www.googleapis.com/youtube/v3/'
  },
  api = {
    base: 'http://localhost/ghub/ytmix/api/',
    playlist: [],
    id: false
  },

var lib = {
  get: function (location, callback) {
    console.log("Grabbing " + location);

    var 
      buffer = '', 
      module = location.match(/https/) ? https : http;

    if(location.length) {
      location = url.parse(location);
    }

    module.get(location, function(res) {

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
      var duration_map = {};

      // The duration field is for some inexplicable reason provided in some
      // wonky format like PT7M18S ... brilliant, youtube ... just fabulous.
      data.items.forEach(function(details) {
        var yt_duration, min, sec, res;

        yt_duration = details.contentDetails.duration;
        res = yt_duration.match(/PT(\d*)M(\d*)S/);
        if(!res) {
          res = yt_duration.match(/PT(\d*)M/);
          sec = 0;
        } else {
          sec = parseInt(res[2], 10);
        }
        min = parseInt(res[1], 10);

        duration_map[details.id] = min * 60 + sec;
      });

      resolve(duration_map);
    });
  });
}

yt.get_playlist = function(playlist_id, cb) {
  // We can't do generators in a promise ... that
  // would be nice ... oh well.
  //
  // We'll need something that grossly resembles recursion.
  // This is the base "seed" case.
  var 
    re_extract = /vi\/(.{11})\/default.jpg$/,
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

        // we should proces the items and 
        // see if they are new or not

        // it's absurd that there's an api cost to getting this id.
        var vid_list = data.items.map(function(which) {
          var res = which.snippet.thumbnails.default.url.match(re_extract);

          return [res[1], which.snippet.title];
        });

        var id_list = vid_list.map(function(vid) { return vid[0]} );
        api.tracks(id_list).then(function(existing) {
          var to_find = id_list.filter(function(i) {return existing.indexOf(i) < 0;});
          yt.duration(to_find).then(function(duration_map) {
            api.playlist = [];

            vid_list.forEach(function(vid) {
              var id = vid[0];

              if(duration_map[id] !== undefined) {
                api.playlist.push(
                  [duration, vid[1], id]
                );
              }
              api.addTracksToPlaylist(api.playlist);

              // and then we just go to our next page.
              // this gets the next page
              my_resolve(data.next(), final_resolve);
            });
          });
        });
      } else {
        final_resolve(payload);
      }
    });
  }

  return new Promise(function(resolve, reject) {
    my_resolve(my_promise, resolve);
  });
}


api.do = function(ep, params, cb) {
  request.post(api.base + ep, {form: params}, function(error, response, body) {
    if(body == undefined) {
      console.log("Error", 'Make sure that ' + api.base + ' is accessible');
    } else {
      var res = JSON.parse(body);
      cb(res.result);
    }
  });
}

// Find what tracks already exist
api.tracks = function(ytid_list) {
  return new Promise(function(resolve, reject) {
    api.do('tracks', {id: ytid_list.join(',')}, function(res) {
      resolve( res.map(function(row) { return row[0] }) );
    });
  });
}

api.addTracksToPlaylist = function(tracklist) {
  api.do('addTracks', {id: api.id, param: tracklist});
}

api.getPlaylist = function(who, cb) {
  api.do('createid', {id: who}, function(data) {
    api.id = data;
    api.do('update', {id: api.id, name: 'Uploads by ' + who});
    cb();
  });
}

function get_playlist() {
  console.log('User: ' + yt.user);

  api.getplaylist(yt.user, function(){
    yt.get_playlist_id(yt.user).then(function(playlist_id) {
      yt.get_playlist(playlist_id).then(function(playlist) {
      });
    });
  });
}

fs.readFile('authkey', 'utf8', function (err, data) {
  if(err) {
    console.log("Unable to find an authkey. Bailing. :-(");
    process.exit();
  }
  yt.authkey = data.replace(/\s/, '');
  get_playlist();
});

