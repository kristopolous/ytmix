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

function api() {
  var 
    args = Array.prototype.slice.call(arguments),
    cb = args.pop();

  if(args.filter(function(m) {return m.search(/\//) > -1}).length) {
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
        cb(body);
      }
    )
  } else {
    easyget(base + args.join('/'), cb);
  }
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
    request.post(base + 'entry.php', {form: {
      func: 'addTracks',
      id: id,
      param: playlist
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

api('createid', source, function(data) {
  console.log(data);
  var res = JSON.parse(data);
  id = res.result;
  readUrl(source);
});
