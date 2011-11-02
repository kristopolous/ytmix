// Search
$(function(){
  var 
    lastSearch = '', 
    input = $("#normal-search"),
    searchID = 0, 
    lastID = 0;

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
          gen();
        });
      } else {
        ev('search.results', []);
        gen();
      }
    }
  }, 650);
});

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

function addVideo(obj) {

  var 
    isPlaying = ev('active.track').ytid == obj.ytid,
    play = $("<a />"),
    queue = $("<a />"),

    open = $("<a>open</a>").attr({
      target: '_blank',
      href: 'http://youtube.com/watch?v=' + obj.ytid
    }).click(Timeline.pause),

    hoverControl = $("<div class=hover>");

  if(isPlaying) {
    play.html('stop').click(function(){ 
      var isPlaying = Timeline.pauseplay(); 

      if(isPlaying == true) { 
        this.innerHTML = 'stop';
      } else {
        this.innerHTML = 'resume';
      }

    });
  } else {
    play.html('play').click(function(){ Timeline.sample(obj); });
  }

  if('playlistid' in obj) {
    queue.html("remove").click(function(){ Timeline.remove(obj.playlistid); });
  } else {
    queue.html("add").click(function(){ Timeline.add(obj, {noplay: true}); });
  }  

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

  if(isPlaying) {
    result.click(Timeline.pause);
    result.addClass('playing');
  } else {
    result.click(function(){
      Timeline.sample(obj);
    });
  }
}

/* 
 db
  .missing('playlistid')
  .find({removed: 0})
  .sort(function(a,b){ 
    return b.reference.length - a.reference.length
  }).select('ytid')
*/
function gen(){
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

  set = db.find(constraints).sort(function(a,b){ 
    return b.reference.length - a.reference.length
  });

  if(ev('search.related').length) {
    var 
      allrelated = db.find('ytid', db.isin(ev('search.related'))).select('related'),
      unique = _.uniq(_.flatten(allrelated));

    set = set.find({ytid: db.isin(unique)});
    $("#search-context").html("related");

  } else {
    set = ev('search.results').concat(set);
  }

  total = set.length;

  start = Math.max(start, 0);
  stop = Math.min(stop, total);

  $("#bottom-buffer").css('height', (total - stop) / perline * _video.height + "px");
  $("#top-buffer").css('height', top - topmodoffset + "px");

  if(
      _video.old.start != start || 
      _video.old.stop != stop   || 
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

    $("#video-viewport").children().remove();

    each(set.slice(start, stop), addVideo);
  }

  $("#video-list").get(0).scrollTop = top;
}

ev({
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

  'playlist.name': function(name, meta) {
    if(meta.old) {
      remote({
        func: 'update',
        name: name,
        id: ev('playlist.id')
      });
    }
  }
});

function runtime(obj) {
  var total = 0;
  each(obj, function(which) {
    if(which && which.length) {
      total += parseInt(which.length);
    }
  });
  return total;
}

function resize(){
  var height = window.innerHeight || document.body.offsetHeight;

  $("#video-list").css('height', (height - $("#bottom-box").offset().top) + 'px');
}

function loadHistory(){
  ev.isset('recent', function(data) {
    each(data, function(which) {
      var 
        total = runtime(which.tracklist),
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

$(function(){
  var 
    dom = $("#playlist-name"), 
    input = $("<input>");

  /*
  if(!ev.isset('uid')) {
    remote({
      func: 'getUser',
      onSuccess: function(uid) {
        ev('uid', uid);
      }
    });
  }
*/
  document.getElementById('initial-search').focus();

  self._scrollwidth = Utils.scrollbarWidth();

  setTimeout(resize, 1000);
  $(window).resize(resize);

  loadHistory();

  ev('playlist.name', function(name) { 
    document.title = name + " on Audisco";
    dom.html(name); 
  });

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

  (function(){

    var timeout;
    function gencheck(){ 
      if(timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(gen, 75);
      return true;
    }
    $("#video-list").scroll(gencheck);
    $("#video-list").keydown(gencheck);
  })();
    
  ev.on('request-gen', gen);

  $("#previous-track").click(function(){
    if (Timeline.player.current.id) {
      Timeline.seekTo(Order[Timeline.player.current.previous].offset + 1);
    }
  });
  $("#next-track").click(function(){
    if (Timeline.player.current.next) {
      Timeline.seekTo(Order[Timeline.player.current.next].offset + 1);
    }
  });

  $("#clear-search").click(function(){
    $("#normal-search").val('');
  });

  $("#pause-play").click(Timeline.pauseplay);
  $("#now").click(Timeline.pauseplay);
  $("#video-viewport").sortable({
    stop: function(){
      var ordinal = _.map(
        $("#video-viewport img"),
        function(n){
          n = n.getAttribute('src').split('/'); 
          n.pop(); 
          return n.pop();
        }
      );
    }
  });
});

ev.on({
  'active.track': function(obj){
    status("Playing " + obj.title);
    ev.set('request-gen');
  },

  'preview.track': function(obj) {
    if(obj) {
      console.log(obj);
      $("#preview-track").html(obj.title);
    } else {
      $("#preview-track").css('display','none');
    }
  }
});

