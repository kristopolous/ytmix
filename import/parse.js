#!/usr/local/bin/node --harmony

//
// In the v3 version of the api we have to
//
//  1. Query the user for their upload playlist id
//  2. Grab the the upload playlist to get the titles and ids
//  3. Query each id to get the durations.
//
var 
  fs = require('fs'),
  request = require('request'),
  https = require('https'),
  http = require('http'),

  // This is for excluding videos that are blocked in our country because you know,
  // we have to make sure that the content distributor gets to limit their marketing 
  // as per their contractual license agreement!
  mylocale = 'US',

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
    id: false
  };

var lib = {
  get: function (location, callback) {
    console.log(" > " + location);

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

    }).on('error', function(e) { 
      console.error(location, e) 
    });
  }
};

// Returns a promise given an end point and 
// set of parameters.
yt.api = function(ep, params) {
  // inject the authkey into the request.
  params.key = yt.authkey;

  var qparams = querystring.stringify(params);
  return new Promise(function(resolve, reject) {
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
        return new Promise(function(resolve, reject) { resolve(false); }).catch(function (ex) { throw ex; });
      }

      resolve(res);
    });
  }).catch(function (ex) { throw ex; });
}

yt.get_playlist_id = function(user, cb) {
  yt.api('channels', {
    part: 'contentDetails',
    forUsername: user
  }).then(function(res) {
    try {
      cb( res.items[0].contentDetails.relatedPlaylists.uploads );
    } catch(ex) {
      console.log("Unable to read playlist. Output follows", ex);
      console.log(res);
    }
  });
}

// returns a value in seconds for a given list of ytids
yt.duration = function(ytid_list) {
  if(!ytid_list.length) {
    return new Promise(function(resolve, reject) {
      resolve({});
    });
  }

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

        if(details.contentDetails.regionRestriction) {
          // Oh noes! We can't view this video in our country because free speech and free
          // press doesn't actually cover the private sector.
          if(details.contentDetails.regionRestriction.blocked.indexOf(mylocale) != -1) {
            return;
          }
        }

        console.log(details);
        yt_duration = details.contentDetails.duration;

        hr = 0;
        min = 0;
        sec = 0;
        hasSec = false;
        hasHour = false;

        res = yt_duration.match(/^PT(\d*)S$/);
        if(res) {
          sec = parseInt(res[1], 10);
        } else {
          res = yt_duration.match(/^PT(\d*)M$/);
          if(!res) {
            res = yt_duration.match(/^PT(\d*)M(\d*)S$/);
            hasSec = true;
          }
          if(!res) {
            res = yt_duration.match(/^PT(\d*)H(\d*)M(\d*)S$/);
            hasHour = true;
          }

          if(res) {
            if(hasHour) {
              hr = parseInt(res.shift(), 10);
            }

            min = parseInt(res[1], 10);

            if(hasSec) {
              sec = parseInt(res.pop(), 10);
            }
          }
        }

        duration = hr * 3600 + min * 60 + sec;
        if(duration !== 0) {
          duration_map[details.id] = duration;
        }
      });

      console.log("map", duration_map);
      resolve(duration_map);
    });
  }).catch(function (ex) { throw ex; });
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
//          console.log([vid_list, to_find]);
          // We need to separately get the duration of each track
          yt.duration(to_find).then(function(duration_map) {
            console.log('duration', duration_map);
            var playlist = [];

            vid_list.forEach(function(vid) {
              var id = vid[0];

              if(duration_map[id] !== undefined) {
                playlist.push(
                  [duration_map[id], vid[1], id]
                );
              }

              // and then we just go to our next page.
              // this gets the next page
            });
            if(playlist.length) {
              console.log(" +++ adding " + playlist.length);
              api.add_tracks_to_playlist(playlist);
            }
            my_resolve(data.next(), final_resolve);
          });
        });
        
      } else {
        final_resolve(payload);
      }
    });
  }

  return new Promise(function(resolve, reject) {
    my_resolve(my_promise, resolve);
  }).catch(function (ex) { throw ex; });
}


api.do = function(ep, params, cb) {
  request.post(api.base + ep, {form: params}, function(error, response, body) {
    if(body == undefined) {
      console.log("Error", 'Make sure that ' + api.base + ' is accessible');
    } else {
      try { 
        var res = JSON.parse(body);
        if(cb) {
          cb(res.result);
        }
      } catch (ex) {
        throw ["Unable to parse " + body, ep, JSON.stringify(params)];
      }
    }
  });
}

// Find what tracks already exist
api.tracks = function(ytid_list) {
  return new Promise(function(resolve, reject) {
    api.do('tracks', {id: ytid_list.join(',')}, function(res) {
      resolve( res.map(function(row) { return row[0] }) );
    });
  }).catch(function (ex) { throw ex; });
}

api.add_tracks_to_playlist = function(tracklist) {
  api.do('addTracks', {id: api.id, param: tracklist});
}

api.get_playlist = function(who, cb) {
  api.do('createid', {id: who}, function(data) {
    api.id = data;
    api.do('update', {id: api.id, name: 'Uploads by ' + who});
    cb();
  });
}

function get_playlist() {
  console.log('User: ' + yt.user);

  api.get_playlist(yt.user, function(){
    yt.get_playlist_id(yt.user, function(playlist_id) {
      yt.get_playlist(playlist_id);
    });
  });
}

if(yt.user) {
  fs.readFile(__dirname + '/../secrets/authkey', 'utf8', function (err, data) {
    if(err) {
      console.log("Unable to find an authkey. Bailing. :-(");
      process.exit();
    }
    yt.authkey = data.replace(/\s/, '');
    get_playlist();
  });
} else {
  console.log("Specify the youtube user name as the first argument");
}

