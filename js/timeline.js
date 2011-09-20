var Timeline = (function(){
  var 
    TimeDB = DB(),
    data = TimeDB.view('id'),
    maxPlayer = 1,
    isPlaying = true,
    Loaded = 0,

    Offset = 0,
    Player = {},
    Total,

    Zoom = 85,
    Scale = 0.04, // ems per second
    UNIQ = 0;
  self.Data = TimeDB;

  $(function(){
    var 
      isDragging = false,
      keyListen = false;

    $("#now").click(function(){
      if(isDragging) {
        isDragging = false;
      } else { 
        Timeline.pauseplay();
      }
    });

    $("#now").css('opacity',0.6).draggable({
      axis: 'x',
      start:function(){ isDragging = true; },
      drag: function(){ $("#scale").css('margin-left', $("#now").offset().left); },
      stop: function(){ $("#scale").css('margin-left', $("#now").offset().left); }
    });

    // we instantiate [maxPlayers] swfobjects which will hold the ytids of the
    // videos we which to play.
    for(var ix = 0; ix < maxPlayer; ix++) {
      $("<div id=vidContainer-" + ix + ">").appendTo("#players");

      swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
        "version=3&enablejsapi=1&playerapiid=player-" + ix,
        "vidContainer-" + ix, "188", "152", "9", null, null, 
        {allowScriptAccess: "always"}, {id: 'player-' + ix});
    }

    function zoomsize(){
      Zoom = Math.min(98, Zoom);
      Zoom = Math.max(5, Zoom);
      $("#scale").css('font-size', Zoom + "%");
    }

    $("#timeline").hover(
      function(){ keyListen = true },
      function(){ keyListen = false }
    ).mousewheel(function(e, delta) {
      Zoom += delta;
      zoomsize();
    });

    $(window).keyup(function(e) {
      if(!keyListen) { return }

      switch(e.which) {
        case 32: Timeline.pauseplay(); break;
        case 37: Timeline.seekTo(Offset - 60); break;
        case 46: Timeline.remove(Player.current); break;
        case 39: Timeline.seekTo(Offset + 60); break;
      }
    });
  });

  eval(_inject('timeline'));
  function updateytplayer() {
    // mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      var time = Player.active.getCurrentTime();

      if (time > 0) {

        Player.current.$title.attr('href', 
          'http://www.youtube.com/watch?v=' + Player.current.ytid + 
          "#at=" + Math.ceil(time) + "s");

        if( Player.active.getPlaybackQuality() != 'large') {
          Player.active.setPlaybackQuality('large');
        }

        if(! ev.isset('timeline.dragging') ) {
          $("#control").css('left', - 100 * ((time + Player.current.offset) / Total) + "%");
        }

        if(Player.active.getDuration() - time == 0) {
          Offset += 1;
          Timeline.seekTo(Offset);
        } else {
          Offset = Player.current.offset + time;
        }
      }
    }
  }

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));
    Loaded ++;

    Player[id] = document.getElementById(playerId);
    Player[id].addEventListener('onStateChange', function(){
      console.log(this, arguments);
    });

    if(Loaded == maxPlayer) {
      setTimeout(function(){ ev.set('flash.load'); },250);
    }
  }

  ev.isset('flash.load', function(){
    Player.active = Player[0];
    setInterval(updateytplayer, 150);
  });

  function swap(x, y) {
    if(data[y]) {

      TimeDB.update(function(row) {
        if(row.id == x) {
          row.id = y;
        } else if (row.id == y) {
          row.id = x;
        }
      });

      Timeline.update_offset();
      Timeline.gen();
      if(Player.current.id == x || Player.current.id == y) {
        Timeline.seekTo(Offset);
      }
    }
  }

  function hook(id) {
    var node = data[id];

    node.$left.click(function(){swap(id, data[id].previous); });
    node.$right.click(function(){swap(id, data[id].next); });
    node.$remove.click(function(){Timeline.remove(id); });
    node.$title.click(Timeline.pause);
    node.dom.hover(
      function(){ node.hover.fadeIn() }, 
      function(){ node.hover.fadeOut() }
    );
  }

  return {
    player: Player,
    data: data,

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
      db.find('ytid', data[index].ytid)
        .update(function(obj){
          // increment the announcement that 
          // this was removed at some point and
          // may not be liked
          obj.removed++;

          db
            .find('ytid', db.isin(obj.related))
            .update(function(record){
              record.reference = _.without(record.reference, data[index].ytid);
            });
        });

      // remove it from the dom
      data[index].dom.remove();

      db.find({reference: function(field) {
        return field.length == 0;
      }}).remove();

      TimeDB.remove({id: index});

      Timeline.seekTo(Offset);
    },

    pause: function(){
      ev.isset('flash.load', function(){
        if(isPlaying) {
          isPlaying = false;
          Player.active.pauseVideo();
          $("#now").css('background','red');
        }
      })
    },

    pauseplay: function(){
      ev.isset('flash.load', function(){
        if(isPlaying) {
          isPlaying = false;
          Player.active.pauseVideo();
          $("#now").css('background','red');
        } else {
          isPlaying = true;
          Player.active.playVideo();
          $("#now").css('background','lime');
        }
      });
    },

    update_offset: function(){
      var 
        aggregate = 0, 
        lastIndex = false;
      Total = runtime(data);

      for(index in data) {
        if(lastIndex !== false) {
          data[lastIndex].next = index;
          data[index].previous = lastIndex;
        }
        lastIndex = index;
        data[index].offset = aggregate;
        aggregate += (parseInt(data[index].length) || 0);
      }

      // This updates the playlist and the offsets
      // stored in the localStorage engine
      Local.update( Timeline.toStore() );
    },

    play: function(dbid, offset) {
      if(!arguments.length) {
        return Player.active.playVideo();
      }

      offset = offset || 0;

      ev.isset('flash.load', function(){
        if(Player.current != data[dbid]) {
          Player.current = data[dbid];
          Timeline.update_offset();
          Player.active.loadVideoById(Player.current.ytid, offset);
          Player.start = $(data[dbid].dom).offset().left - $("#control").offset().left;
        }
      });
    },

    seekTo: function(offset) {
      if(!offset) {
        offset = Offset;
      }

      Timeline.update_offset();

      var absolute = (offset < 1) ? offset * Total : offset, 

      absolute = Math.max(0, absolute);
      absolute = Math.min(Total, absolute);

      var track = TimeDB.findFirst(function(row) { return (row.offset < absolute && (row.offset + row.length) > absolute) });
      console.log(track);

      if(track.id != Player.current.id) {
        Timeline.play(track.id, absolute - track.offset);
      } else {
        Player.active.seekTo(absolute - track.offset);
      }
    },

    flush: function(){
      Timeline.stop();
      TimeDB.remove();  
    },

    updatePosition: function() {
      var 
        offset = $("#control").offset().left - $("#scale").offset().left,
        relative = offset / $("#control").width();

      console.log(relative);
      Timeline.seekTo( - relative);
    },

    init: function() {
      ev.isset('timeline.init', function(){
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
      });

      ev.set('timeline.init');
    },

    gen: function(){
      $("#control").children().remove();

      for(var ix = 0; ix < UNIQ; ix++) {
        if(data[ix]) {
          $(".hover", data[ix].dom).css('display','none');
          $("#control").append(data[ix].dom);
          hook(ix);
        }
      }
    },

    add: function(obj, opts) {
      var ytid = obj.ytid;
      opts = opts || {};

      var 
        myid = UNIQ ++,

        $left = $("<a>&lt;&lt;</a>").addClass('half'),
        $remove = $("<a>X</a>").addClass('half'),
        $right = $("<a>&gt;&gt;</a>").addClass('half'),
        $title = $("<a />").attr({
          target: '_blank',
          href: "http://www.youtube.com/watch?v=" + obj.ytid
        }).html(obj.title);
        
      var
        hoverControl = $("<span class=hover />")
          .append($left)
          .append($remove)
          .append($right),

        dom = $("<div />")
          .addClass('track')
          .append(hoverControl)
          .append("<img src=http://i.ytimg.com/vi/" + ytid + "/hqdefault.jpg?w=188&h=141>")
          .append($title)
          .appendTo('#control');

      Timeline.init();

      TimeDB.insert({
        $left: $left,
        $right: $right,
        $title: $title,
        $remove: $remove,
        title: obj.title,
        hover: hoverControl,
        id: myid,
        ytid: ytid,
        active: true,
        length: obj.length,
        dom: dom
      });

      hook(myid); 

      dom.css('width', obj.length * Scale + 'em');

      Timeline.update_offset();

      if(opts.noplay != true) {
        Timeline.play(myid);
      }

      return myid;
    }
  };
})();

