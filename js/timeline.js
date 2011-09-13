var Timeline = (function(){
  var 
    data = {},
    maxPlayer = 1,
    isPlaying = true,
    NodeSelected = false,
    Loaded = 0,

    // idsActive is the list of ids, corresponding to the vidContiainers
    // that should be currently loaded.  Trivially, idsActive[centroid]
    // should usually be playing
    idsActive = [],

    Offset = 0,
    Player = {},
    Total,

    ix,
    Zoom = 85,
    scale = 0.04, // ems per second
    UNIQ = 0;

  $(function(){
    var isDragging = false;

    $("#now").click(function(){
      if(isDragging) {
        isDragging = false;
      } else { 
        Timeline.pauseplay();
      }
    });

    $("#now").css('opacity',0.6).draggable({
      axis: 'x',
      start:function(){
        isDragging = true;
      },
      drag: function(){
        $("#scale").css('margin-left', $("#now").offset().left);
      },
      stop: function() {
        $("#scale").css('margin-left', $("#now").offset().left);
      }
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

    var keyListen = false;
    $("#timeline").hover(
      function(){ keyListen = true },
      function(){ keyListen = false }
    ).mousewheel(function(e, delta) {
      console.log(Zoom);
      Zoom += delta;
      zoomsize();
    }).mouseleave(function(){
      if(NodeSelected !== false) {
        data[NodeSelected].dom.addClass('deletion');
      }
    }).mouseenter(function(){
      if(NodeSelected !== false) {
        data[NodeSelected].dom.removeClass('deletion');
      }
    });

    $("#zoom").mousemove(function(e){
      Zoom = e.layerY / 2;
      zoomsize();
    });

    $(document.body).mouseup(function(){
      if(NodeSelected !== false && data[NodeSelected].dom.hasClass('deletion')) {
        Timeline.remove(NodeSelected);
        NodeSelected = false;
      }
    }).keyup(function(e) {
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
    if(Player.active.getCurrentTime && Player.active.getCurrentTime() > 0) {
      var time = Player.active.getCurrentTime();

      Offset = Player.current.offset + time;

      Player.current.title.attr('href', 
          'http://www.youtube.com/watch?v=' + Player.current.ytid + 
          "#at=" + Math.ceil(time) + "s");

      if( Player.active.getPlaybackQuality() != 'large') {
        Player.active.setPlaybackQuality('large');
      }

      if(! ev.isset('timeline.dragging') ) {
        $("#control").css('left', - 100 * ((time + Player.current.offset) / Total) + "%");
      }

      if(Player.active.getDuration() - time < 2) {
        if( data[Player.current.index + 1] ){
          Player.current.title.attr('href', 'http://www.youtube.com/watch?v=' + Player.current.ytid);
          Timeline.play(Player.current.index + 1);
        }
      }
    }
  }

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));
    Loaded ++;

    Player[id] = document.getElementById(playerId);

    if(Loaded == maxPlayer) {
      setTimeout(function(){
        ev.set('flash.load');
      },250);
    }
  }

  ev.isset('flash.load', function(){
    Player.active = Player[0];
    setInterval(updateytplayer, 100);
  });

  return {
    player: Player,
    data: data,

    remove: function(index){
      // find the yt id at the index to
      // be removed
      var 
        ytid = data[index].ytid,

        // and the corresponding object
        // in our database
        obj = db.findFirst({
          ytid: ytid
        });

      // increment the announcement that 
      // this was removed at some point and
      // may not be liked
      obj.removed++;

      // remove it from the dom
      data[index].dom.remove();

      db.find('count', 0).remove();

      data[index].active = false;
    },

    fadeOut: function(){
      Player.active.fadeOut(1000, function(){
        Timeline.pause();
        Player.active.setVolume(100);
      });
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
      Total = _.reduce(_.pluck(data, 'length'), function(a, b) { return (a || 0) + (b || 0) }, 0);

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

      var 
        relative = (offset < 1) ? offset * Total : offset, 
        aggregate = 0,
        index;

      relative = Math.max(0, relative);
      relative = Math.min(Total, relative);

      for(index = 0;;index++) {
        if((! data[index + 1]) || data[index + 1].offset > relative) {
          if(index != Player.current.index) {
            Timeline.play(index);
          }
          Player.active.seekTo(relative - data[index].offset);
          break;
        }
      }
    },

    flush: function(){
      Timeline.stop();
      data = [];
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
            $("#trashcan").css('display','block');
          },
          stop: function() {
            ev.unset('timeline.dragging');
            $("#trashcan").css('display','none');
            Timeline.updatePosition();
          }
        });
      });

      ev.set('timeline.init');
    },

    add: function(ytid, opts) {
      var myid = UNIQ;
      opts = opts || {};

      Timeline.init();

      data[myid] = {
        index: myid,
        flash: true,
        ytid: ytid,
        active: true,
        title: $("<a target=_blank href=http://www.youtube.com/watch?v=" + ytid + "/>").click(Timeline.pause)
      };

      data[myid].dom = $("<div />")
        .addClass('track')
        .mousedown(function(){ 
          NodeSelected = myid; 
          console.log(myid);
        })  
        .mouseup(function(){ 
          data[NodeSelected].dom.removeClass('deletion');
          NodeSelected = false; 
        })
    	  .append("<img src=http://i.ytimg.com/vi/" + ytid + "/hqdefault.jpg?w=188&h=141>")
        .append(data[myid].title)

      data[myid].dom.appendTo('#control');

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

      Local.add(id, {
        title: obj.title,
        video: data[id].ytid, 
        length: obj.length
      });

      data[id].length = obj.length;
      data[id].dom.css('width', obj.length * scale + 'em');

      db.find({
        ytid: db.isin(obj.related)
      });

      Timeline.update_offset();
    }
  };
})();

