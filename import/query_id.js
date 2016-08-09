#!/usr/local/bin/node --harmony

var 
  fs = require('fs'),
  https = require('https'),
  querystring = require('querystring'),
  url = require('url'),
  yt = {
    id: process.argv[2],
    authkey: false,
    base: 'https://www.googleapis.com/youtube/v3/'
  };

function get (location, callback) {
  var buffer = '';

  if(location.length) {
    location = url.parse(location);
  }

  https.get(location, function(res) {
    res.on('data', function(data) { buffer += data });
    res.on('end', function(){ callback.call(this, JSON.parse(buffer)); });
  });
}

// Returns a promise given an end point and 
// set of parameters.
yt.api = function(ep, params) {
  // inject the authkey into the request.
  params.key = yt.authkey;

  var qparams = querystring.stringify(params);
  return new Promise(function(resolve, reject) {
    get(yt.base + ep + '?' + qparams, function(res) {

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

function get_vid_info() {
  if(!yt.id) {
    throw new Error("Woops ... need to pass video ids");
  }

  var mypromise = yt.api('videos', {
    part: 'contentDetails,snippet,statistics',
    id: yt.id
  });

  return new Promise(function(resolve, reject) {
    mypromise.then(function(data) {
      console.log(JSON.stringify(data.items, null, 4));
    });
  }).catch(function (ex) { throw ex; });
}

fs.readFile(__dirname + '/../secrets/authkey', 'utf8', function (err, data) {
  if(err) {
    console.log("Unable to find an authkey. Bailing. :-(");
    process.exit();
  }
  yt.authkey = data.replace(/\s/, '');
  get_vid_info();
});

