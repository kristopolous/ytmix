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
      ev.set('request_gen', {force: true});
      return localStorage["s" + id]; 
    },
    view: function (object, id, offset) {
      localStorage["v" + id] = true;

      if(UserHistory.isStarred(id)) {
        $("#is-starred").addClass('active');
      } else {
        $("#is-starred").removeClass('active');
      }

      object.loadVideoById(id, offset);
    }
  }
})();
var Timeline = (function(){
  var 
    // The current offset into the total
    // playlist, in seconds
    _offset = 0,

    // The total duration of all the tracks
    // to be played.
    _totalRuntime,

    _data = db.view('id'),
    _order = db.view('order'),
    _maxPlayer = 1,
    _isPlaying = true,
    _loaded = 0,

    Player = {
      controls: [],

      Play: function(){
        ev.isset('flash_load', function(){
          if(!_isPlaying) {
            _isPlaying = true;
            Player.active.playVideo();
            $("#pause-play").html("&#9726;");
          }
        });
      }
    };

  function updateytplayer() {
    ev.set('tick');

    // mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      localStorage[ev.db.playlist_id + 'offset'] = _offset;

      var time = Player.active.getCurrentTime();

      if (time > 0 && Player.activeData) {

        // This generates the scrubber in the results tab below.
        // We first check to see if the video is in the viewport window
        if(Results.viewable[Player.activeData.ytid]) {
          // And if so we get its dom and other necessary things.
          var entry = Results.viewable[Player.activeData.ytid];

          // If we are in the purview of the track, then we can move on.
          // Otherwise, place ourselves underneath it so that the percentage
          // calculations will work out.
          Scrubber.real.attach(entry.jquery.timeline);
          Scrubber.real.dom.css({ left: (time * 100 / Player.active.getDuration()) + '%'});
        } else {
          Scrubber.real.remove();
        }

        // For some reason is appears that this value can
        // toggle back to non-high quality sometimes. So 
        // we check to see where it's at
        if( Player.active.getPlaybackQuality() != 'large') {
          Player.active.setPlaybackQuality('large');
        }

        // If the player is active and we are at the end of a song, then move ahead
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

      if(_loaded == _maxPlayer) {
        setTimeout(function(){ ev.set('flash_load'); }, 1);
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
  ev('app_state', function(value) {
    if (value == 'main') {
      _totalRuntime = Utils.runtime(_data);

      var myoffset = localStorage[ev.db.playlist_id + 'offset'];
      if(myoffset) {
        Timeline.seekTo(myoffset);
      } else {
        Timeline.seekTo((0.001 * (-_epoch + (+new Date()))) % _totalRuntime);
      }

      ev.isset("flash_load", Results.scrollTo);
    }
  });

  ev.isset('flash_load', function(){
    Player.active = Player.controls[0];
    setInterval(updateytplayer, 150);
  });

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

        if(obj.related) {
          db
            .find('ytid', db.isin(obj.related))
            .update(function(record){
              record.reference = _.without(record.reference, _data[index].ytid);
            });
        }
      });

    db.find({reference: function(field) {
      return field.length == 0;
    }}).remove();

    var removed = db.remove({id: index});

    if(removed.length) {
      if(removed[0].offset < _offset) {
        _offset -= removed[0].length;
        Timeline.seekTo(_offset);
      } else {
        Timeline.updateOffset();
      }
    }
  };

  return {
    player: Player,
    order: _order,
    data: _data,

    remove: function(index){
      var playlist = ev('playlist_tracks');

      Toolbar.status("Removed " + _order[index].title);
      Scrubber.real.remove();

      playlist_splice(index, 1);
      ev('playlist_tracks', playlist);

      ev.set('request_gen');
    },

    pause: function(){
      ev.isset('flash_load', function(){
        _isPlaying = false;
        each(Player.controls, function (which) {
          which.pauseVideo();
        });
        $("#pause-play").html("&#9659;");
      });
    },

    pauseplay: function(){
      if(_isPlaying) {
        Timeline.pause();
      } else {
        Player.Play();
      }
      return _isPlaying;
    },

    updateOffset: function(){
      var 
        index,
        aggregate = 0, 
        order = 0,
        prevIndex = false;

      _totalRuntime = Utils.runtime(_data);

      for(index in _data) {
        _data[index].order = order;
        order++;

        if(prevIndex !== false) {
          _data[prevIndex].next = index;
          _data[index].previous = prevIndex;
        }

        prevIndex = index;
        _data[index].offset = aggregate;
        aggregate += (parseInt(_data[index].length) || 0);
      }
      // This final next pointer will enable wraparound
      if(index) {
        _data[index].next = 0;
        _data[0].previous = index;
      }
      db.sync();
    },

    play: function(dbid, offset) {
      if(_.isString(dbid)) {
        dbid = db.findFirst({ytid: dbid}).id;
      }
      if(!arguments.length) {
        return Player.Play();
      }

      offset = offset || 0;

      // Only run when the flash controller has been loaded
      ev.isset('flash_load', function(){
        if(!_data[dbid]) {
          Timeline.pause();
        } else if(Player.activeData != _data[dbid]) {
          Player.activeData = _data[dbid];
          UserHistory.view(Player.active, Player.activeData.ytid, offset);

          // At this point there is now active data, so anything depending
          // on that can run.
          ev('active_track', Player.activeData);
          ev.set('active_data');
          Player.Play();
          console.log((+new Date()) - START);
        } else {
          Timeline.seekTo(offset, "relative");
        }
      });
    },

    seekTo: function(offset, isRelative) {
      if(!offset) {
        offset = _offset;
      }
      if (isRelative) {
        offset += Player.activeData.offset;
      }

      Timeline.updateOffset();

      // If it's between 0 and 1, we assume it's a relative offset ... otherwise we
      // take it as the absolute; and we modulus it by the runtime to permit wrap-around
      var absolute = ((offset < 1) ? offset * _totalRuntime : offset) % _totalRuntime;

      absolute = Math.max(0, absolute);
      absolute = Math.min(_totalRuntime, absolute);

      var track = db.findFirst(function(row) { 
        return (row.offset < absolute && (row.offset + row.length) > absolute) 
      });

      if(track) {
        if(!Player.activeData || (track.id != Player.activeData.id)) {
          Timeline.play(track.id, absolute - track.offset);
        } else {
          Player.active.seekTo(absolute - track.offset);
        }
      }
    },

    init: function() {
      // we instantiate [maxPlayers] swfobjects which will hold the ytids of the
      // videos we which to play.
      for(var ix = 0; ix < _maxPlayer; ix++) {
        $("<div id=vidContainer-" + ix + ">").appendTo("#players");

        swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
          "version=3&enablejsapi=1&playerapiid=player-" + ix,
          "vidContainer-" + ix, "188", "152", "9", null, null, 
          {allowScriptAccess: "always"}, {id: 'player-' + ix});
      }

      // This doesn't reflect the filtered view ... it would be nice to know what the
      // "previous" and "next" track is effeciently with a filter.
      // The controls in the upper left of the timeline
      $("#previous-track").click(function(){
        Timeline.seekTo(_order[Timeline.player.activeData.previous].offset + 1);
      });

      $("#next-track").click(function(){
        Timeline.seekTo(_order[Timeline.player.activeData.next].offset + 1);
      });

      $("#pause-play").click(Timeline.pauseplay);

      $("#is-starred").click(function(){
        UserHistory.star(Player.activeData.ytid);
        $(this).toggleClass('active');
      })
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

