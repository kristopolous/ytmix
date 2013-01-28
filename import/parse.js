#!/usr/bin/env node

var 
  https = require('https'),
  http = require('http'),
  xml2js = require('xml2js'),
  url = require('url'),
  source = 'https://gdata.youtube.com/feeds/api/users/' + 'ClassicDNBChannel' + '/uploads',
  mysql = require('db-mysql'),
  fs = require('fs');

var 
  playlistid = 'LLvyPrFyPTBXmXNJItvAKSQQ',
  playlist = [],
  id = 0,
  title = "(no title)",
  subtitle;

function newentry(entry) {
  if (entry.title.constructor != String) {
    entry.title = entry.title['#'];
  }
  ytid = entry['media:group']['yt:videoid'];
  if (ytid == undefined) {
    switch(entry.link[0]['@'].type) {
      case 'text/html':
        ytid = entry.link[0]['@'].href.match(/v=([\w-_]*)&/)[1];
        break;
      case 'application/atom+xml':
        ytid = entry.link[0]['@'].href.split('/').pop();
        break;
    }
  }
  playlist.push({
    length: parseInt(entry['media:group']['yt:duration']['@']['seconds']),
    title: entry.title,
    ytid: ytid,
    related: [],
    reference: [],
    playlistid: id++
  });
}

function addEntries(xml) {
  var parser = new xml2js.Parser(), ytid;
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
    if ("forEach" in result.entry) {
      result.entry.forEach(newentry)
    } else {
      newentry(result.entry);
    }

    next = result.link.filter(function(entry) {
      return entry['@']['rel'] == 'next';
    });

    if(next.length > 0) {
      nextUrl = next[0]['@']['href'];
      readUrl(nextUrl);
      console.log({action: "reading", data: nextUrl});
    } else {
      finish();
    }

   });
}
function readUrl(urlstr) {
  var buffer = "";
  parsed = url.parse(urlstr);
  parsed.path = parsed.pathname + (parsed.search || "");
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
    var connection = this;
    connection.query()
      .select("id")
      .from("playlist")
      .where('authors = ?', [source])
      .execute(function(error, result) {
        
        if(result.length) {
          connection.query()
            .update('playlist')
            .set({ tracklist: JSON.stringify(playlist) })
            .where("id = ?", [result[0].id])
            .execute(function(error, result1) {
              if (error) {
                console.log({action: "db", error: error});
              } else {
                console.log({action: "db", updated: result[0].id});
                http.get("http://qaa.ath.cx/ytwatch1/api/playlist.php?func=generatePreview&id=" + result[0].id, function(res){
                  console.log(res);
                });
              }
            });
        } else {
          connection.query().
            insert('playlist',
              ['authors', 'name', 'tracklist'],
              [source, title, JSON.stringify(playlist)]
            ).execute(function(error, result) {
              if (error) {
                console.log({action: "db", error: error});
              } else {
                console.log({action: "db", created: result.id});
                console.log("http://qaa.ath.cx/ytwatch1/api/playlist.php?func=generatePreview&id=" + result.id);
                http.get("http://qaa.ath.cx/ytwatch1/api/playlist.php?func=generatePreview&id=" + result.id, function(res){
                  console.log(res);
                });
              }
            });
        }
      })
  });
}

readUrl(source);
