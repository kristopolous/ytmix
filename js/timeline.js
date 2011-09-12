var Timeline = (function(){
  var 
    data = {},
    maxPlayer = 1,
    isPlaying = true,
    Loaded = 0,

    // idsActive is the list of ids, corresponding to the vidContiainers
    // that should be currently loaded.  Trivially, idsActive[centroid]
    // should usually be playing
    idsActive = [],

    player = {},
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

    $("#timeline").mousewheel(function(e, delta) {
      console.log(Zoom);
      Zoom += delta;
      zoomsize();
    });

    $("#zoom").mousemove(function(e){
      Zoom = e.layerY / 2;
      zoomsize();
    });

  });

  function updateytplayer() {
    // mechanics for moving the centroid
    if(player.active.getCurrentTime && player.active.getCurrentTime() > 0) {

      if(! ev.isset('timeline.dragging') ) {
        $("#control").css('left', - 100 * ((player.active.getCurrentTime() + player.current.offset) / Total) + "%");
      }

      if(player.active.getDuration() - player.active.getCurrentTime() < 2) {
        if( data[player.current.index + 1] ){
          Timeline.play(player.current.index + 1);
        }
      }
    }
  }

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));
    Loaded ++;

    player[id] = document.getElementById(playerId);

    if(Loaded == maxPlayer) {
      setTimeout(function(){
        ev.set('flash.load');
      },250);
    }
  }

  ev.isset('flash.load', function(){
    player.active = player[0];
    setInterval(updateytplayer, 100);
  });

  return {
    player: player,
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

    pauseplay: function(){
      ev.isset('flash.load', function(){
        if(isPlaying) {
          isPlaying = false;
          player.active.pauseVideo();
          $("#now").css('background','red');
        } else {
          isPlaying = true;
          player.active.playVideo();
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
        return player.active.playVideo();
      }

      ev.isset('flash.load', function(){
        player.current = data[dbid];
        Timeline.update_offset();
        player.active.loadVideoById(player.current.ytid);
        player.start = $(data[dbid].dom).offset().left - $("#control").offset().left;
      });
    },

    seekTo: function(offset) {
      Timeline.update_offset();

      var 
        relative = offset * Total,
        aggregate = 0,
        index;

      for(index = 0;;index++) {
        if((! data[index + 1]) || data[index + 1].offset > relative) {
          if(index != player.current.index) {
            Timeline.play(index);
          }
          player.active.seekTo(relative - data[index].offset);
          break;
        }
      }
    },

    flush: function(){
      Timeline.stop();
      data = [];
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
            var 
              offset = $("#control").offset().left - $("#scale").offset().left,
              relative = offset / $("#control").width();

            Timeline.seekTo( - relative);
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
        title: $("<a target=_blank href=http://www.youtube.com/watch?v=" + ytid + "/>")
      };

      var handle = $("<div class=handle</div>");
      handle.myid = myid;

      data[myid].dom = $("<div />")
        .addClass('track')
        .hover(
          function(){handle.css('display','block')},
          function(){handle.css('display','none')}
        )
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

      Local.add(id, [data[id].ytid, obj.title]);

      data[id].length = obj.length;
      data[id].dom.css('width', obj.length * scale + 'em');

      db.find({
        ytid: db.isin(obj.related)
      });

      Timeline.update_offset();
    }
  };
})();

