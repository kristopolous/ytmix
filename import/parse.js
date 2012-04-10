var 
  https = require('https'),
  xml2js = require('xml2js'),
  url = require('url'),
  mysql = require('db-mysql'),
  fs = require('fs');

var 
  playlist = [],
  id = 0,
  title,
  subtitle;

function addEntries(xml) {
  var parser = new xml2js.Parser();
  parser.parseString(xml, function (err, result) {
    if(err) {
      console.log(xml.toString());
      console.log(err);
    }
    if('title' in result) {
      title = result.title;
      subtitle = result.subtitle;
    }
    result.entry.forEach(function(entry) {
      playlist.push({
        length: entry['media:group']['yt:duration']['@']['seconds'],
        title: entry.title,
        ytid: entry['media:group']['yt:videoid'],
        related: [],
        reference: [],
        playlistid: id++
      });
    });
    next = result.link.filter(function(entry) {
      return entry['@']['rel'] == 'next';
    });
    if(next.length > 0) {
      nextUrl = next[0]['@']['href'];
      readUrl(nextUrl);
    } else {
      finish();
    }
    console.log(nextUrl);
   });
}
function readUrl(urlstr) {
  var buffer = "";
  parsed = url.parse(urlstr);
  parsed.path = parsed.pathname + parsed.search;
  https.get(parsed, function(res) {
    res.on('data', function(d) {
      buffer += d;
    });
    res.on('end', function(){
      addEntries(buffer);
    });
  }).on('error', function(e) {
    console.error(e);
  });
}
function finish(){
  new mysql.Database({
    hostname: 'localhost',
    user: 'php',
    password: 'fixy2k',
    database: 'yt'
  }).connect(function(error) {
    this.query().
      insert('playlist',
        ['name', 'tracklist'],
        [title, JSON.stringify(playlist)]
      ).execute(function(error, result) {
        if (error) {
          console.log('ERROR: ' + error);
          return;
        }
        console.log('GENERATED id: ' + result.id);
      });
  });
}

fs.readFile('playlist1.xml', function(err, data) {
  addEntries(data);
});

