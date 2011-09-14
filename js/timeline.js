var Timeline = (function(){
  var 
    Data = DB(),
    data = Data.view('id'),
    maxPlayer = 1,
    isPlaying = true,
    Loaded = 0,

    Offset = 0,
    Player = {},
    Total,

    Zoom = 85,
    Scale = 0.04, // ems per second
    UNIQ = 0;
  self.Data = Data;

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

  function updateytplayer() {
    // mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      var time = Player.active.getCurrentTime();

      if (time > 0) {

        Player.current.title.attr('href', 
          'http://www.youtube.com/watch?v=' + Player.current.ytid + 
          "#at=" + Math.ceil(time) + "s");

        if( Player.active.getPlaybackQuality() != 'large') {
          Player.active.setPlaybackQuality('large');
        }

        if(! ev.isset('timeline.dragging') ) {
          $("#control").css('left', - 100 * ((time + Player.current.offset) / Total) + "%");
        }

        if(Player.active.getDuration() - time == 0) {
          if(Offset == Player.current.offset + time) { 
            Offset += 4;
            Timeline.seekTo(Offset);
          }
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

      Data.update(function(row) {
        if(row.id == x) {
          row.id = y;
        } else if (row.id == y) {
          row.id = x;
        }
      });

      Timeline.gen();
      if(player.current.index == x || player.current.index == y) {
        Timeline.seekTo(Offset);
      }
    }
  }

  function hook(id) {
    var node = data[id];

    node.left.click(function(){swap(id, id - 1); });
    node.right.click(function(){swap(id, id + 1); });
    node.remove.click(function(){Timeline.remove(id); });
    node.title.click(Timeline.pause);
    node.dom.hover(
      function(){ node.hover.css('display','block') }, 
      function(){ node.hover.css('display','none') }
    );
  }

  return {
    player: Player,
    data: data,

    remove: function(index){
      db.find('ytid', data[index].ytid)
        .update(function(obj){
          // increment the announcement that 
          // this was removed at some point and
          // may not be liked
          obj.removed++;
        });

      // remove it from the dom
      data[index].dom.remove();

      db.find('count', 0).remove();

      Data.remove({id: index});

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
      var aggregate = 0;
      Total = runtime(data);

      for(index in data) {
        data[index].offset = aggregate;
        aggregate += (data[index].length || 0);
      }
    },

    play: function(dbid) {
      if(!arguments.length) {
        return Player.active.playVideo();
      }

      ev.isset('flash.load', function(){
        if(Player.current != data[dbid]) {
          Player.current = data[dbid];
          Timeline.update_offset();
          Player.active.loadVideoById(Player.current.ytid);
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

      console.log(absolute, Total);
      var track = Data.findFirst(function(row) { return (row.offset < absolute && (row.offset + row.length) > absolute) });
      console.log(track);

      if(track.id != Player.current.id) {
        Timeline.play(track.id);
      }

      Player.active.seekTo(absolute - track.offset);
    },

    flush: function(){
      Timeline.stop();
      Data.remove();  
    },

    updatePosition: function() {
      var 
        offset = $("#control").offset().left - $("#scale").offset().left,
        relative = offset / $("#control").width();

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

    add: function(ytid, opts) {
      opts = opts || {};

      var 
        myid = UNIQ,

        left = $("<a>&lt;&lt;</a>").addClass('half'),
        remove = $("<a>X</a>").addClass('half'),
        right = $("<a>&gt;&gt;</a>").addClass('half'),
        title = $("<a target=_blank href=http://www.youtube.com/watch?v=" + ytid + "/>"),
        hoverControl = $("<span class=hover />")
          .append(left)
          .append(remove)
          .append(right);

      Timeline.init();

      Data.insert({
        left: left,
        right: right,
        remove: remove,
        hover: hoverControl,
        id: myid,
        ytid: ytid,
        active: true,
        title: title,
        dom: $("<div />")
          .addClass('track')
          .append(hoverControl)
          .append("<img src=http://i.ytimg.com/vi/" + ytid + "/hqdefault.jpg?w=188&h=141>")
          .append(title)
          .appendTo('#control')
      });

      hook(myid); 

      if(db.findFirst({ytid: ytid}).related) {
        Timeline.update(myid);
      }

      UNIQ ++;

      if(opts.noplay != true) {
        Timeline.play(myid);
      }

      return myid;
    },

    update: function(id){
      var obj = db.findFirst({ytid: data[id].ytid});

      data[id].title.html(obj.title);
      data[id].length = obj.length;
      data[id].dom.css('width', obj.length * Scale + 'em');

      Local.add(id, {
        title: obj.title,
        video: data[id].ytid, 
        length: obj.length
      });

      Timeline.update_offset();
    }
  };
})();

