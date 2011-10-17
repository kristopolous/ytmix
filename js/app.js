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

    if(query != lastSearch && query.length) {
      lastSearch = query;

      $.getJSON('api/ytsearch.php', { 
          id: ++searchID,
          query: query
        }, function(res) {

        if(res.id < lastID) { return; }

        lastID = res.id;

        $("#search-results").children().remove();

        ev('search.results', res.vidList);

        each(res.vidList, function(video) {
          addVideo(extend(
            {container: "#search-results"},
            video
          ));
        });
      });
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

      if(! data.reference) {
        data.reference = [];
      }

      data.reference.push(backref.ytid);
      data.removed = data.removed || 0;
    });
  })
}

var _remote = {
  active: false,
  queue: []
};

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
          (_remote.queue.pop())();
        }
      }, 1000);
    });
  } 
}

function addVideo(opts) {
  var 
    play = $("<a>play</a>").click(function(){ Timeline.add(opts); }),
    queue = $("<a>queue</a>").click(function(){ Timeline.add(opts, {noplay: true}); }),

    open = $("<a>open</a>").attr({
      target: '_blank',
      href: 'http://youtube.com/watch?v=' + opts.ytid
    }).click(Timeline.pause),

    remove = $("<a>remove</a>").click(function(){ 
      db
        .find('ytid', opts.ytid)
        .update({ hide: true }) 
      gen();
    }),

    hoverControl = $("<span class=hover>")
      .append(play)
      .append(queue)
      .append(open);

  $("<span class=result/>")
    .hover(
      function(){ hoverControl.css('display','block') }, 
      function(){ hoverControl.css('display','none') }
    )
    .append("<img src=http://i4.ytimg.com/vi/" + opts.ytid + "/default.jpg><p>" + opts.title + "</p>")
    .append(hoverControl)
    .appendTo(opts.container);
}

var _video = {
  width: 130 + 4 * 2 + 4 * 2,
  height: 106 + 8 * 2 + 4 * 2,
  old: {start: 0, stop: 0}
};

function gen(){
  var 
    width = $("#video-list").width(),
    height = $("#video-list").height(),
    top = $("#video-list").scrollTop(),
    bottom = $("#video-list").height() + top,
    total = db.find().length,
    perline = Math.floor(width / _video.width),
    start = Math.floor(top / _video.height) * perline,
    stop = Math.floor(bottom / _video.height) * perline,
    topmodoffset = top % _video.height;

  $("#top-buffer").css('height', top + "px");
  $("#bottom-buffer").css('height', (total - stop) / perline * _video.height - topmodoffset + "px");

  if(_video.old.start == start && _video.old.stop == stop) {
    return;
  }
  _video.old = { start : start, stop : stop };

  $("#video-viewport").children().remove();

  each(db.sort('count', 'desc').slice(start, stop), function(which) {
    addVideo(extend(
      {container: "#video-viewport"},
      which
    ));
  });

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
  var 
    width = window.innerWidth || document.body.offsetWidth,
    height = window.innerHeight || document.body.offsetHeight;

  $(".resize").css('height', (height - 225) + 'px');

  $("#video-list").css({
    height: (height - 196) + 'px',
    width: (width - 167) + 'px'
  });
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

  resize();
  $(window).resize(resize);

  loadHistory();

  ev('playlist.name', function(name) { dom.html(name); });

  Utils.onEnter(input, function() {
    ev("playlist.name", this.value);
    $(this).replaceWith(dom);
  });

  dom.click(function(){
    $(this).replaceWith(input);
    input.val(ev('playlist.name'));
    input.focus();
  });

  (function(){
    var 
      top = $("#video-list").scrollTop(),
      timeout;

    function gencheck(force){
      var newtop = $("#video-list").scrollTop();

      if(newtop != top || (force === true)) {
        newtop = top;
        gen();
      }

      if(timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout( gencheck, 200);
    }

    ev.on('request-gen', function(){
      gencheck(true);
    });
    gencheck();
  })();
    

  $("#main-menu").click(function(){
    location.href = document.location.toString().split('#')[0];
  });
});
