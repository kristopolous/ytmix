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

function status(message) {
  $("#status .message")
    .html(message)
    .css({
      display: 'block',
      opacity: 1,
      top: "-30px"
    })
    .animate({top: "10px"}, 1000, function(){
      setTimeout(function(){
        $("#status .message").fadeOut(1000);
      }, 1500);
    });
}
  
function loadRelated(obj, opts){
  if(_remote.active) {
    _remote.queue.push(function(){
      loadRelated(obj, opts);
    });
    return;
  }

  _remote.active = true;

  var match = {ytid: obj.ytid};
  
  if(!db.findFirst(match).serverData) {

    $.getJSON( 'api/related.php', match, function (data){
      db
        .find(match)
        .update({
          removed: 0,
          related: _.pluck(data.related, 'ytid'),
          serverData: data
        });

      addVids(data.related, obj);
    
      ev.set('request-gen');

      setTimeout(function(){
        _remote.active = false;
        if(_remote.queue.length) {
          (_remote.queue.shift())();
        }
      }, 1000);
    });
  } 
}

function loadHistory(){
  ev.isset('recent', function(data) {
    each(data, function(which) {
      var 
        total = Utils.runtime(which.tracklist),
        container = $("<span class=splash-container>").appendTo("#splash-history"),
        forget = $("<a>forget</a>"),
        play = $("<a>play</a>"),
        hoverControl = $("<span class=hover />")
          .append(play)
          .append(forget),
        track = $("<span class=track />").append(hoverControl);

      forget.click(function(){
        Store.remove(which.id);
        container.slideUp();
      });

      play.click(function(){
        ev('app.state', 'main');
        Store.get(which.id);
      });

      for(var ix = 0; ix < Math.min(which.tracklist.length, 4); ix++) {
        track.append("<img src=http://i4.ytimg.com/vi/" + which.tracklist[ix].ytid + "/default.jpg>");
      }

      container
        .hover(
          function(){ hoverControl.css('display','block') }, 
          function(){ hoverControl.css('display','none') }
        )
        .append(track)
        .append("<p>" + which.name + 
           " <br><small>(" + which.tracklist.length + " track" + (which.tracklist.length != 1 ? 's' : '') + " " 
           + Utils.secondsToTime(total) + 
           ")</small></p>");
    });
    $("#history").fadeIn();
  });
}

ev.test('playlist.tracks', function(data, meta) {
  db.insert(data);
  meta.done(true);
});

function makePlaylistNameEditable() {
  var 
    dom = $("#playlist-name"), 
    input = $("<input>");

  Utils.onEnter(input, function() {
    ev("playlist.name", this.value);
    input.replaceWith(dom);
    $("#edit-name").html("edit");
  });

  $("#edit-name").click(function(){
    if(this.innerHTML == 'edit') {
      this.innerHTML = "save";
      dom.replaceWith(input);
      input.val(ev('playlist.name'));
      input.focus();
    } else {
      ev("playlist.name", input.val());
      input.replaceWith(dom);
      this.innerHTML = "edit";
    }
  });
}

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
      ev('app.state', 'main');

      input.val(this.value);

      ev.isset('search.results', function(results) { 
        ev.isset('playlist.id', function(){
          ev.push('playlist.tracks', results[0]); 
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

        ev('search.query', query);

        if( query.length && ev('search.related').length == 0) {
          lastSearch = query;

          $.getJSON('api/ytsearch.php', { 
              id: ++searchID,
              query: query
            }, function(res) {

            if(res.id < lastID) { return; }

            lastID = res.id;

            ev('search.results', res.vidList);
            Results.gen();
          });
        } else {
          ev('search.results', []);
          Results.gen();
        }
      }
    }, 650);
  
    _get('initial-search').focus();
  }
};

var Results = {
  viewable: {},

  init: function(){
    var timeout;

    self._scrollwidth = Utils.scrollbarWidth();
    setTimeout(Results.resize, 1000);

    $(window).resize(Results.resize);
    // The gencheck function just makes sure
    // that we don't call the generator too
    // frequently, less the system gets hosed
    // because it's perpetually trying to redraw
    // everything when it doesn't need to.
    function gencheck(){ 
      if(timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(Results.gen, 75);
      return true;
    }

    $("#video-list")
      .scroll(gencheck)
      .keydown(gencheck);

    ev.on('request-gen', Results.gen);
  
  },

  resize: function(){
    var height = window.innerHeight || document.body.offsetHeight;

    $("#video-list").css('height', (height - $("#bottom-box").offset().top) + 'px');
  },

  draw: function(obj) {

    // Look to see if we have generated this before.
    var dbReference = db.find({ytid: obj.ytid});
    if(dbReference.length) {
      if(dbReference[0].dom) {
        // If so, then just take the old dom entry and
        // append it to the video viewport, returning
        // the object that was previously created.

        dbReference[0].dom.hoverControl.css('display','none');

        $("#video-viewport").append(dbReference[0].dom);
        return dbReference[0].dom;
      }
    }

    var 
      play = $("<a />"),
      queue = $("<a />"),

      open = $("<a>open</a>").attr({
        target: '_blank',
        href: 'http://youtube.com/watch?v=' + obj.ytid
      }).click(Timeline.pause),

      hoverControl = $("<div class=hover>");

    hoverControl
      .append(play)
      .append(queue)
      .append(open);

    var result = $("<span class=result/>")
      .hover(
        function(){ hoverControl.css('display','block') }, 
        function(){ hoverControl.css('display','none') }
      )
      .append("<img src=http://i4.ytimg.com/vi/" + obj.ytid + "/default.jpg><span><p><em>" + obj.title + "</em>" + Utils.secondsToTime(obj.length) + "</p></span>")
      .append(hoverControl)
      .appendTo($("#video-viewport"));

    play.html('play').click(function(){
      Timeline.sample(obj);
    });

    if('playlistid' in obj) {
      queue.html("remove").click(function(){ Timeline.remove(obj.playlistid); });
    } else {
      queue.html("add").click(function(){ Timeline.add(obj, {noplay: true}); });
    }  

    // back reference of what we are generating
    result.ytid = obj.ytid;
    result.hoverControl = hoverControl;

    db.find({ytid: obj.ytid}).update({dom: result});

    return result;
  },

  gen: function(){
    var 
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      top = $("#video-list").scrollTop(),
      bottom = $("#video-list").height() + top,
      set,
      total,
      constraints = {removed: 0},
      query = ev('search.query'),
      perline = Math.floor(width / _video.width),
      start = Math.floor(top / _video.height) * perline,
      stop = Math.ceil(bottom / _video.height) * perline,
      topmodoffset = top % _video.height;

    if(query.length) {
      constraints.title = db.like(query);
    }

    var 
      tracks = Timeline.db.find().length,
      bBoost, aBoost;

    // There's a function that permits one to just display the related results
    // This not only show the isolated related results, but then modifies the
    // drop down menu near the related results to say as much.  This second
    // part should probably be removed and abstracted to somewhere else.
    if(ev('search.related').length) {
      var 
        allrelated = db.find('ytid', db.isin(ev('search.related'))).select('related'),
        unique = _.uniq(_.flatten(allrelated));

      set = db.find(constraints, {ytid: db.isin(unique)});
    } else {
      // To make sure that our playlist gets to the front of the line,
      // I create booster functions for sorting.  I should probably
      // permit multi-tiered sorting based on various parameters in my
      // sorting function, but I don't think I do that ... there's probably
      // some tricky ordinal stuff I'd have to pull.
      set = db.find(constraints).sort(function(a,b){ 
        bBoost = isNaN(b.playlistid) ? 0 : (tracks - b.playlistId) * 1000;
        aBoost = isNaN(a.playlistid) ? 0 : (tracks - a.playlistId) * 1000;
        return (bBoost + b.reference.length) - (aBoost + a.reference.length);
      });

      set = ev('search.results').concat(set);
    }

    // We find out some statistics about what we should be
    // generating the viewport to know whether we need
    // to clear everything and try again.
    total = set.length;

    start = Math.max(start, 0);
    stop = Math.min(stop, total);

    // These are the two buffers of non-generation that are kept
    // at the top and the bottom of the query results. These
    // help preserve the scroll bar order.
    $("#bottom-buffer").css('height', (total - stop) / perline * _video.height + "px");
    $("#top-buffer").css('height', top - topmodoffset + "px");

    // These are sanity checks to see if we need to regenerate
    // the viewport based on say, a user scrolling something,
    // new results coming in, old results being deleted, etc.
    //
    // It's worth noting that we key the range not based on
    // ordinals but on the ytid at the ordinals.  This is to
    // try to thwart results changing with a bunch of other
    // things not.
    if(
        _video.old.start != start || 
        _video.old.stop != stop  || 
        _video.old.query != query  || 
        _video.old.length != total ||
        _video.old.current != ev('active.track').ytid
      ) {

      _video.old = { 
        start : start, 
        stop : stop, 
        query : query, 
        length : set.length, 
        current: ev('active.track').ytid 
      };

      $("#video-viewport").children().detach();

      // Make a viewable reference available so
      // that other functions can hook inside here
      // if they want to know if something is active
      // or not
      Results.viewable = {};

      // We take the results from all the things that we
      // display on the screen (it returns a jquery element
      // with a back reference to the ytid).
      each(map(set.slice(start,stop), Results.draw), function(which) {

        // And then we create our map based on ytid
        // of the jquery and the dom reference. This
        // is used in the updateytplayer function of
        // timeline.js in order to generate and update
        // the result based scrubber.
        Results.viewable[which.ytid] = {
          jquery: which,
          dom: which.get(0)
        };

      });
    }

    // This is used to make sure that our regeneration efforts
    // don't confuse the browser an cause a scrolling problem.
    // 
    // Based on when things generate in the DOM, a race condition
    // can occur that will make the results slowly scroll by in
    // Chrome.
    $("#video-list").get(0).scrollTop = top;
  }
};

ev({
  // The app.state variable maintains whether the application is
  // at the splash screen or at a specific playlist.  We can check
  // for double fires with the meta.old functions (see evda.js)
  'app.state': function(state, meta) {
    if(state == meta.old) {
      return;
    } 

    if(state == 'splash') {
      ev.unset('playlist.id','playlist.tracks','playlist.name');
      Timeline.pause();
      Timeline.gen();
      $(".main-app").css('display','none');
      $("#splash").css('display','block');
      loadHistory();
    } else if (state == 'main') {
      $(".main-app").css({
        opacity: 0,
        display: 'inline-block'
      }).animate({
        opacity:1
      }, 1000);

      $("#splash").css('display','none');
    }
  },

  'search.related': function(list) {
    if(list.length) {
      $("#search-context-title")
        .css('display','inline-block')
        .html("related&#9660;");
    } else {
      $("#search-context-title").css('display','none');
    }
  },

  'playlist.name': function(name, meta) { 
    document.title = name + " on Audisco";
    $("#playlist-name").html(name);

    if(meta.old) {
      remote({
        func: 'update',
        name: name,
        id: ev('playlist.id')
      });
    }
  },

  'active.track': function(obj){
    status("Playing " + obj.title);
    ev.set('request-gen');
  },

  'preview.track': function(obj) {
    if(obj) {
      $("#preview-track").html(obj.title);
    } else {
      $("#preview-track").css('display','none');
    }
  }
});

$(function(){
  Results.init();
  makePlaylistNameEditable();

  Timeline.init();
  Search.init();

  $(".now").click(Timeline.pauseplay);
});

