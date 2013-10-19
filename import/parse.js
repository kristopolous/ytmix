#!/usr/bin/env node

var 
  request = require('request'),
  base = 'http://localhost:8000/ghub/ytmix/api/',
  http = require('http'),
  xml2js = require('xml2js'),
  url = require('url'),
  source = 'http://gdata.youtube.com/feeds/api/users/' + process.argv[2] + '/uploads';

var 
  playlist = [],
  id = 0,
  title = "(no title)",
  subtitle;

  console.log(source);

function newentry(entry) {
  if (entry.title.constructor != String) {
    entry.title = entry.title[0]['_'];
  }
  ytid = entry['media:group']['yt:videoid'];
  if (ytid == undefined) {
    switch(entry.link[0].$.type) {
      case 'text/html':
        ytid = entry.link[0].$.href.match(/v=([\w-_]*)&/)[1];
        break;
      case 'application/atom+xml':
        ytid = entry.link[0]['$'].href.split('/').pop();
        break;
    }
  }

  playlist.push([
    parseInt(entry['media:group'][0]['yt:duration'][0]['$']['seconds']),
    entry.title,
    ytid
  ]);
}

function easyget(location, callback) {
  var buffer = '';
  if(location.length) {
    location = url.parse(location);
  }
  http.get(location, function(res) {
    res.on('data', function(d) { buffer += d; });
    res.on('end', function(){
      callback.call(this, buffer);
    });
  }).on('error', function(e) {
    console.error(location, e);
  });
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
    request.post(base + 'playlist.php', {form: {
      func: 'addTracks',
      id: id,
      tracklist: playlist
    }}, function(error, response, body) {
      console.log(error, response.body, body);

      result.link = result.feed.link;
      next = result.link.filter(function(entry) {
        return entry['$']['rel'] == 'next';
      });

      if(next.length > 0) {
        nextUrl = next[0]['$']['href'];
        readUrl(nextUrl);
        console.log({action: "reading", data: nextUrl});
      } else {
        finish();
      }
        }
      );
   });
}

function readUrl(urlstr) {
  parsed = url.parse(urlstr);
  parsed.path = parsed.pathname + (parsed.search || "");

  easyget(parsed, addEntries);
}

function finish(){
  easyget(base + 'playlist.php?func=createID&source=' + source, function(data) {
    var 
      res = JSON.parse(data),
      id = res.result;

    if(id) {
      (function(){
        var me = arguments.callee;
        var subset = playlist.splice(0, 25);
        easyget(base + 'playlist.php?func=addTracks&id=' + id + 'tracklist=' + escape(JSON.stringify(subset)),
          function(what) {
            console.log(what);
            if(playlist.length) {
              me();
            }
          }
        );
      })();
    }
  });
}

easyget(base + 'entry.php?func=createID&source=' + source, function(data) {
  console.log(data);
  var res = JSON.parse(data);
  id = res.result;
  readUrl(source);
});
