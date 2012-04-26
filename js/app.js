// See utils.js for how a queue could ostensibly work.
// At the time of the comment's authorship, it's being
// used just like an array.
_remote.queue = new Queue();

// Adds vids in the format 
// {length: sec, title: text, ytid: youtube id}
function addVids(vidList, backref) {
  // insert each related video into our
  // db of known videos if needed
  each(vidList, function(video) {
    db.insert(video).update(function(data){
      data.reference.push(backref.ytid);
      data.removed = data.removed || 0;
    });
  })
}

// Loads the videos related to a db object that
// should have ytid defined.  It is also designed
// so it doesn't hose the serve with a bunch of
// requests but instead tries to space them out
// so that one finishes, some time lapses, then
// another one starts.
//
// The related videos for the playlist are stored
// as the database object which has the problem
// of related videos becoming stale and delisted,
// as of now (2011/11/27) unsolved, but it avoids
// the problem of having to have this stagnant
// request cycle every time a user tries to load
// the playlist for his or her own use.
//
// Stale links should be taken care of OOB and not
// be a deferred problem that justifies funky looking
// incremental loads.
//
function loadRelated(obj, opts){
  if(_remote.active) {
    _remote.queue.push(function(){
      loadRelated(obj, opts);
    });
    return;
  }

  var match = {ytid: obj.ytid};
  
  // The related entry will be null (see the template in
  // _init_.js for more info) unless this call is made
  if(!db.findFirst(match).related) {

    // This "mutex like" object is to
    // make sure that we don't request
    // more then one related at a time.
    _remote.active = true;

    // The match happens to be the same as the server
    // query in this case
    $.getJSON( 'api/related.php', match, function (data){
      addVids(data.related, obj);

      db
        .find(match)
        .update({
           related: db.find({ytid: db.isin(_.pluck(data.related, 'ytid'))})
        });

      ev.set('request_gen');

      // This makes sure that we don't hammer
      // the server to get related videos
      setTimeout(function(){
        _remote.active = false;
        _remote.queue.doshift();
      }, 1000);
    });
  } else { 
    _remote.queue.doshift();
  }
}

// This is on the splash page. It loads
// the recent history of tracks that have
// been previously played.
function loadHistory(){
  ev.isset('recent', function(data) {

    each(data, function(which) {
      var 
        total = Utils.runtime(which.tracklist),
        container = $("<span class=splash-container>").appendTo("#splash-history"),
        play = $("<img class=play src=css/play.png />").click(function(){
          ev('app_state', 'main');
          Store.get(which.id);
        }),
        track = $("<span class=track />");

      for(var ix = 0; ix < Math.min(which.tracklist.length, 4); ix++) {
        track.append("<img src=http://i4.ytimg.com/vi/" + which.tracklist[ix].ytid + "/default.jpg>");
      }

      container
        .hover(function(){play.fadeIn()}, function(){play.fadeOut()})
        .append(track)
        .append(play)
        .append("<p>" + which.name + 
           " <br><small>(" + which.tracklist.length + " track" + (which.tracklist.length != 1 ? 's' : '') + " " 
           + Utils.secondsToTime(total) + 
           ")</small></p>");
    });

    $("#history").fadeIn();
  });
}

ev.test('playlist_tracks', function(data, meta) {
  db.insert(data);
  meta.done(true);
});

var Search = {
  init: function(){
    var 
      lastSearch = '', 
      input = $("#normal-search"),

      // These indexes make sure that we don't generate old search results
      // that may have asynchronously came in later than newer ones
      searchID = 0, 
      lastID = 0;

    $("#clear-search").click(function(){ $("#normal-search").val(''); });

    $("#search-context").hover(
      function(){
        $("#search-context-dropdown").css('display','block');
      },
      function(){
        $("#search-context-dropdown").css('display','none');
      }
    );

    Utils.onEnter("#initial-search", function(){
      ev('app_state', 'main');

      input.val(this.value);

      ev.isset('search.results', function(results) { 
        ev.isset('playlist_id', function(){
          ev.push('playlist_tracks', results[0]); 
        });
      });
    });

    input.focus(function(){ this.select(); });

    // We probe to see if the search query has changed.
    // And if so we instantiate an image based on that
    // Similar to google instant and ytinstant.
    setInterval(function(){
      var query = input.val();

      if(query != lastSearch) {

        ev('search_query', query);

        if( query.length && ev('search_related').length == 0) {
          lastSearch = query;

          $.getJSON('api/ytsearch.php', { 
              id: ++searchID,
              query: query
            }, function(res) {

            if(res.id < lastID) { return; }

            lastID = res.id;

            ev('search_results', res.vidList);
            Results.gen();
          });
        } else {
          ev('search_results', []);
          Results.gen();
        }
      }
    }, 650);
  
    _get('initial-search').focus();
  }
};

ev({
  // The app_state variable maintains whether the application is
  // at the splash screen or at a specific playlist.  We can check
  // for double fires with the meta.old functions (see evda.js)
  'app_state': function(state, meta) {
    if(state == meta.old) {
      return;
    } 

    if(state == 'splash') {
      ev.unset('playlist_id','playlist_tracks','playlist_name');
      Timeline.pause();
      Timeline.build();
      $(".main-app").css('display','none');
      $("#splash").css('display','block');
      loadHistory();
      document.body.style.overflow = 'auto';
    } else if (state == 'main') {
      $(".main-app").css({
        opacity: 0,
        display: 'inline-block'
      }).animate({
        opacity: 1
      }, 1000);

      $("#splash").css('display','none');
      document.body.style.overflow = 'hidden';
    }
  },

  'search_related': function(list) {
    if(list.length) {
      $("#search-context-title")
        .css('display','inline-block')
        .html("related&#9660;");
    } else {
      $("#search-context-title").css('display','none');
    }
  },

  'playlist_name': function(name, meta) { 
    document.title = name + " on Audisco";
    $("#playlist-name").html(name);

    if(meta.old) {
      remote({
        func: 'update',
        name: name,
        id: ev('playlist_id')
      });
    }
  },

  'active_track': function(obj){
    Toolbar.status("Playing " + obj.title);
    ev.set('request_gen');
  },

  'preview_track': function(obj) {
    if(obj) {
      $("#preview-track").html(obj.title);
    } else {
      $("#preview-track").css('display','none');
    }
  }
});

$(function(){
  Results.init();
  Toolbar.init();

  Timeline.init();
  Search.init();

  $(".now").click(Timeline.pauseplay);
  window.Scrubber = {
    real: $("#real-scrubber"),
    phantom: $("#phantom-scrubber")
  };
  
  Scrubber.phantom.click(function() {
    var entry = db.findFirst({ ytid: Scrubber.id });
    Timeline.play(Scrubber.id, entry.length * Scrubber.offset);
  });
});

