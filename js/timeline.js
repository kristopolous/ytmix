var UserHistory = (function(){

  return {
    isViewed: function(id) {
      return localStorage["v" + id];
    },
    isStarred: function(id) {
      return localStorage["s" + id];
    },
    star: function(id) {
      if(UserHistory.isStarred(id)) {
        delete localStorage["s" + id];
      } else {
        localStorage["s" + id] = true;
      }
      return localStorage["s" + id]; 
    },
    view: function (object, id, offset) {
      localStorage["v" + id] = true;
      object.loadVideoById(id, offset);
    }
  }
})();
var Timeline = (function(){
  var 
    // The internal database of what is
    // being played and its order
    TimeDB = DB(),

    Player = undefined,

    // The current offset into the total
    // playlist, in seconds
    _offset = 0,

    // The total duration of all the tracks
    // to be played.
    _totalRuntime,

    _data = TimeDB.view('id'),
    _order = TimeDB.view('order'),
    _maxPlayer = 1,
    _isPlaying = true,
    _loaded = 0,
    _zoom = 85,
    _scale = 0.04, // ems per second

    UNIQ = 0;

  eval(_inject('timeline'));
  Player = {
    controls: [],

    Pauseplay: function(){
      if(_isPlaying) {
        Player.Pause();
      } else {
        Player.Play();
      }
      return _isPlaying;
    },

    Pause: function(){
      ev.isset('flash_load', function(){
        _isPlaying = false;
        each(Player.controls, function (which) {
          which.pauseVideo();
        });
        $(".now").css('background','red');
      });
    },

    Play: function(){
      ev.isset('flash_load', function(){
        if(!_isPlaying) {
          _isPlaying = true;
          Player.active.playVideo();
          $(".now").css('background','#99a');
        }
      });
    }
  };

  $(function(){
    var 
      isDragging = false,
      keyListen = false;

    $("#timeline-now").click(function(){
      if(isDragging) {
        isDragging = false;
      } 
    });

    $("#timeline-now").css('opacity',0.6).draggable({
      axis: 'x',
      start:function(){ isDragging = true; },
      drag: function(){ $("#scale").css('margin-left', $("#timeline-now").offset().left); },
      stop: function(){ $("#scale").css('margin-left', $("#timeline-now").offset().left); }
    });

    // we instantiate [maxPlayers] swfobjects which will hold the ytids of the
    // videos we which to play.
    for(var ix = 0; ix < _maxPlayer; ix++) {
      $("<div id=vidContainer-" + ix + ">").appendTo("#players");

      swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
        "version=3&enablejsapi=1&playerapiid=player-" + ix,
        "vidContainer-" + ix, "188", "152", "9", null, null, 
        {allowScriptAccess: "always"}, {id: 'player-' + ix});
    }

    function zoomsize(){
      _zoom = Math.min(98, _zoom);
      _zoom = Math.max(5, _zoom);
      $("#scale").css('font-size', _zoom + "%");
    }

    $("#timeline").hover(
      function(){ keyListen = true },
      function(){ keyListen = false }
    ).mousewheel(function(e, delta) {
      _zoom += delta;
      zoomsize();
    });

    $(window).keyup(function(e) {
      if(!keyListen) { return }

      switch(e.which) {
        case 37: Timeline.seekTo(_offset - 60); break;
        case 46: Timeline.remove(Player.activeData); break;
        case 39: Timeline.seekTo(_offset + 60); break;
      }
    });
  });

  function updateytplayer() {
    ev.set('tick');

    // mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      var time = Player.active.getCurrentTime();

      if (time > 0 && Player.activeData) {

        // This generates the scrubber in the results tab below.
        // We first check to see if the video is in the viewport window
        if(Results.viewable[Player.activeData.ytid]) {
          // And if so we get its dom and other necessary things.
          var container = Results.viewable[Player.activeData.ytid];

          // If we are in the purview of the track, then we can move on.
          // Otherwise, place ourselves underneath it so that the percentage
          // calculations will work out.
          if(_get("result-now").parentNode != container.dom) {

            $("#result-now")
              .remove()
              .css('display', 'block')
              .appendTo(container.jquery);
          }

          $("#result-now").css({ left: (time * 100 / Player.active.getDuration()) + '%'});
        } else {
          $("#result-now").css('display','none');
        }

        each(_.values(Player.activeData.$link), function(which) {
          which.attr({
            href : 'http://www.youtube.com/watch?v=' + Player.activeData.ytid + "#at=" + Math.ceil(time) + "s",
            onclick: 'Timeline.pause()'
          });
        });

        // For some reason is appears that this value can
        // toggle back to non-high quality sometimes. So 
        // we check to see where it's at
        if( Player.active.getPlaybackQuality() != 'large') {
          Player.active.setPlaybackQuality('large');
        }

        if(! ev.isset('timeline.dragging') ) {
          $("#control").css('left', - 100 * ((time + Player.activeData.offset) / _totalRuntime) + "%");
        }

        if(time > 0 && Player.active.getDuration() > 0 && (Player.active.getDuration() - time == 0)) {
          _offset += 1;
          Timeline.seekTo(_offset);
        } else {
          _offset = Player.activeData.offset + time;
        }
      }
    }
  }

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));

    if(_loaded < _maxPlayer) {
      _loaded ++;

      Player.controls[id] = document.getElementById(playerId);

      // I don't think this actually gets run, regardless of
      // what YT's official documentation says.
      Player.controls[id].addEventListener('onStateChange', function(){ 
        console.log(this, arguments); 
      });

      if(_loaded == _maxPlayer) {
        setTimeout(function(){ ev.set('flash_load'); },250);
      }
    }
  }

  // When the flash player is loaded all the way
  // then we can set the first player to be called
  // the active player, which is the one that we will
  // use for the most part.
  //
  // This is also when we start our polling function
  // that updates the scrubber and the status of
  // where we currently are.
  ev.isset('flash_load', function(){
    Player.active = Player.controls[0];
    setInterval(updateytplayer, 150);
  });

  function swap(x, y) {
    if(_data[y]) {

      TimeDB.update(function(row) {
        if(row.id == x) {
          row.id = y;
        } else if (row.id == y) {
          row.id = x;
        }
      });

      Timeline.updateOffset();
      Timeline.build();
      if(Player.activeData.id == x || Player.activeData.id == y) {
        Timeline.seekTo(_offset);
      }
    }
  }

  function hook(id) {
    var node = _data[id];

    node.$remove.click(function(){Timeline.remove(id); });
    node.$related.click(function(){
      if(!node.filter) {
        node.$related.addClass('on');
        ev.setadd('search.related', node.ytid);
        node.filter = true;
      } else {
        node.$related.removeClass('on');
        ev.setdel('search.related', node.ytid);
        node.filter = false;
      }
      ev.set('request_gen');
    });

    node.dom.hover(
      function(){ node.hover.css('display','block'); }, 
      function(){ node.hover.css('display','none'); }
    );
  }

  function add(obj, opts) {
    opts = opts || {};

    loadRelated(obj);

    var 
      myid = UNIQ ++,

      $remove = $("<a>X</a>").addClass('close'),
      $control = $("<span />"),
      $move = $("<a>move</a>").appendTo($control),
      $related = $("<a>related</a>").appendTo($control),
      $link = {
        text: $("<a />").attr({
            target: '_blank',
            href: "http://www.youtube.com/watch?v=" + obj.ytid
          }).html(obj.title),

        image: $("<a />")
          .addClass('image')
          .attr({
            target: '_blank',
            href: "http://www.youtube.com/watch?v=" + obj.ytid
          }).html("<img class=thumb src=http://i.ytimg.com/vi/" + obj.ytid + "/hqdefault.jpg?w=188&h=141>")
      },
      
      hoverControl = $("<span class=timeline-hover />")
        .append($link.image)
        .append($remove)
        .append($control)
        .append($("<p />")
          .append($link.text)
          .append(Utils.secondsToTime(obj.length))
        ),

      wrap = $("<span class=timeline-hover-wrap />").append(hoverControl);

    var record = TimeDB.insert({
      $remove: $remove,
      $related: $related,
      $move: $move,
      $link: $link,
      filter: false,
      title: obj.title,
      hover: wrap,
      id: myid,
      ytid: obj.ytid,
      active: true,
      length: obj.length,

      dom: $("<div />")
        .css('width', obj.length * _scale + 'em')
        .addClass('track')
        .append(wrap)
        .append("<span class=title>" + obj.title + "</span>")
    });

    ev('tick', function(){ record[0].dom.appendTo('#control'); }, {once: true});

    hook(myid); 

    Timeline.updateOffset();

    db.find('ytid', obj.ytid)
      .update({playlistid: myid});

    // Add the related videos and then
    // back reference them to this video
    addVids(obj.related, obj);
  }

  function remove(index) {
    // This track was just removed from the timeline.
    // This means that we need to removed it from the
    // data view of the timeline and reflect the fact
    // that it was removed in the larger database.
    db.find('ytid', _data[index].ytid)
      .update(function(obj){
        // increment the announcement that 
        // this was removed at some point and
        // may not be liked
        obj.removed++;
        delete obj.playlistid;

        if(obj.related) {
          db
            .find('ytid', db.isin(obj.related))
            .update(function(record){
              record.reference = _.without(record.reference, _data[index].ytid);
            });
        }
      });

    // remove it from the dom
    var dom = _data[index].dom;

    db.find({reference: function(field) {
      return field.length == 0;
    }}).remove();

    var removed = TimeDB.remove({id: index});

    if(removed.length) {
      if(removed[0].offset < _offset) {
        _offset -= removed[0].length;
        Timeline.seekTo(_offset);
      } else {
        Timeline.updateOffset();
      }
    }

    ev('tick', function(){ dom.remove(); }, {once: true});
  };

  function build(){
    if(arguments.length) {
      var 
        trackList = arguments[0],
        timelineMap = TimeDB.keyBy('ytid');

      each(trackList, function(which) {
        TimeDB.find('ytid', which.ytid).update({order: which.playlistid});
      });

      Timeline.updateOffset();
      return;
    }

    var trackList = arguments[0] || ev('playlist_tracks') || [];

    each(trackList, function(track, index) {
      if(_order[index] && track.ytid != _order[index].ytid) {
        remove(index);
      }
      if(!_order[index] || track.ytid != _order[index].ytid) {
        add(track);
      }
    });

    each(_order, function(value, index) {
      if(index >= trackList.length) {
        remove(index);
      } else if(value.ytid != trackList[index].ytid) {
        remove(index);
        add(value);
      }
    });

    /*$("#control").children().detach();

    for(var ix = 0; ix < UNIQ; ix++) {
      if(_data[ix]) {
        $(".hover", _data[ix].dom).css('display','none');
        $("#control").append(_data[ix].dom);
        hook(ix);
      }
    }*/

    setTimeout(function(){
      if(Player.activeData) {
        Timeline.seekTo((0.001 * (-_epoch + (+new Date()))) % _totalRuntime);
      }
    }, 3000);
  }

  ev('playlist_tracks', function(){build();});

  return {
    db: TimeDB,
    player: Player,
    data: _data,

    toStore: function(){
      var store = [];

      TimeDB
        .find()
        .sort('id', 'asc')
        .each(function(which) {
          store.push({
            length: which.length,
            title: which.title,
            ytid: which.ytid
          })
        });

      return store;
    },

    remove: function(index){
      var playlist = ev('playlist_tracks');

      Toolbar.status("Removed " + _order[index].title);
      $("#result-now").remove().appendTo(document.body);

      playlist_splice(index, 1);
      ev('playlist_tracks', playlist);

      ev.set('request_gen');
    },

    pause: function(){
      return Player.Pause();
    },

    pauseplay: function(){
      return Player.Pauseplay();
    },

    updateOffset: function(){
      var 
        aggregate = 0, 
        order = 0,
        lastIndex = false;

      _totalRuntime = Utils.runtime(_data);

      for(index in _data) {
        _data[index].order = order;
        order++;

        if(lastIndex !== false) {
          _data[lastIndex].next = index;
          _data[index].previous = lastIndex;
        }

        lastIndex = index;
        _data[index].offset = aggregate;
        aggregate += (parseInt(_data[index].length) || 0);
      }
      TimeDB.sync();
    },

    play: function(dbid, offset) {
      if(_.isString(dbid)) {
        dbid = TimeDB.findFirst({ytid: dbid}).id;
      }
      if(!arguments.length) {
        return Player.Play();
      }

      offset = offset || 0;

      ev.isset('flash_load', function(){
        if(!_data[dbid]) {
          Timeline.pause();
        } else if(Player.activeData != _data[dbid]) {
          Player.activeData = _data[dbid];
          UserHistory.view(Player.active, Player.activeData.ytid, offset);
          Player.start = $(_data[dbid].dom).offset().left - $("#control").offset().left;
          Player.Play();
        }
      });
    },

    seekTo: function(offset) {
      if(!offset) {
        offset = _offset;
      }

      Timeline.updateOffset();

      var absolute = (offset < 1) ? offset * _totalRuntime : offset;

      absolute = Math.max(0, absolute);
      absolute = Math.min(_totalRuntime, absolute);

      var track = TimeDB.findFirst(function(row) { 
        return (row.offset < absolute && (row.offset + row.length) > absolute) 
      });

      if(track) {
        if(track.id != Player.activeData.id) {
          Timeline.play(track.id, absolute - track.offset);
        } else {
          Player.active.seekTo(absolute - track.offset);
        }
      }
    },

    build: build,

    updatePosition: function() {
      var 
        offset = $("#control").offset().left - $("#scale").offset().left,
        relative = offset / $("#control").width();

      Timeline.seekTo( - relative);
    },

    init: function() {
      // The controls in the lower left of the timeline
      $("#previous-track").click(function(){
        if (Timeline.player.activeData.id) {
          Timeline.seekTo(_order[Timeline.player.activeData.previous].offset + 1);
        }
      });

      $("#pause-play").click(Timeline.pauseplay);

      $("#next-track").click(function(){
        if (Timeline.player.activeData.next) {
          Timeline.seekTo(_order[Timeline.player.activeData.next].offset + 1);
        }
      });
      $("#control").draggable({
        axis: 'x',
        start: function(){
          ev.set('timeline.dragging');
        },
        stop: function() {
          ev.unset('timeline.dragging');
          Timeline.updatePosition();
        }
      });
    },

    add: function(obj, opts) {
      opts = opts || {};

      Toolbar.status("Added " + obj.title);
      ev.push('playlist_tracks', obj);

      if(opts.noplay != true) {
        Timeline.play(UNIQ - 1);
      }
    }
  };
})();

