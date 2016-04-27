var UserHistory = {
  reload: function(){
    /*
    log("Reloading");
    UserHistory.view(Player.active, Player.activeData.ytid, Player.active.getCurrentTime());
    */
  },
  view: function (object, id, offset) {
    var opts = {
      videoId: id, 
      startSeconds: offset,
      suggestedQuality: ev('quality')
    };

    Player.offset = offset;

    Timeline
      .backup
      .off(object)
      .loadVideoById(opts);

    // TODO: This feels like a bad place to do this.
    // There should probably be a more abstract and less 
    // explicit way to handle this.
    ev.set('deadair', 0);
  }
};

var Timeline = (function(){
  var 
    // The current offset into the total
    // playlist, in seconds
    _offset = 0,

    // The total duration of all the tracks
    // to be played.
    _totalRuntime,

    _isPlaying = true,

    _backup = {},
    _template = {},
    _rateWindow = [],

    // preferred quality
    _quality, 

    Player = {
      controls: false,

      eventList: [ 
        'StateChange',
        'PlaybackQualityChange',
        'PlaybackRateChange',
        'Error',
        'ApiChange'
      ],

      Quality: {
        set: function(what) {
          if(what < 0 || !_.isNumber(what)) { what = 0; } 

          _quality = QUALITY_LEVELS[what % QUALITY_LEVELS.length];
          $("#quality-down")[ (_quality == _.last(QUALITY_LEVELS) ? 'add' : 'remove') + 'Class']("disabled");
          $("#quality-up")[ (_quality == _.first(QUALITY_LEVELS) ? 'add' : 'remove') + 'Class']("disabled");

          // This function is invoked at startup without arguments.
          if(arguments.length) {
            Toolbar.status("Set preferred quality to " + _quality);
          }
          ev('quality', _quality);

          return _quality;
        },

        down: function(){ 
          return Player.Quality.set(_.indexOf(QUALITY_LEVELS, _quality) + 1);
        },

        up: function(){
          return Player.Quality.set(_.indexOf(QUALITY_LEVELS, _quality) - 1);
        }
      },

      Play: function(){
        ev.isset('player_load', function(){
          if(!_isPlaying) {
            _isPlaying = true;
            Player.active.playVideo();
            $("#pause-play").html('<i class="fa fa-stop"></i>');
          }
        });
      }
    };

  Player.Quality.set();

  // The "current" list of videos is the same as all.
  // the current could point to some other database entirely
  _db.byId = _db.ALL = _db.view('id');
  _db.current = _db;

  _backup = {
    start: 0,

    off: function(){
      if(Player.active.off) {
        $("#backupPlayer").html('');
        Player.active = Player.controls;
      }
      return Player.active;
    },

    getCurrentTime: function(){
      return Player.offset + ((new Date()) - _backup._start) / 1000;
    },

    getDuration: function(){
      return Player.activeData.length;
    },

    pauseVideo: function() {
      Player.offset = Player.active.getCurrentTime();
      $("#backupPlayer").html('');
    },

    seekTo: function(what) {
      Player.active.pauseVideo();
      Player.offset = what;
      Player.active.playVideo();
    },

    playVideo: function(){
      // We pad for load time
      Player.active._start = (+new Date()) + 2000;

      $("#backupPlayer").html(
        Template.backup({
          offset: Math.floor(Player.offset),
          ytid: Player.activeData.ytid
        })
      );
    },

    getPlaybackQuality: function(){
      return _quality;
    },

    on: function() {
      Player.offset = Player.offset || 0;

      Player.active = _backup;
      Player.active.playVideo();
    }
  };

  function updateytplayer() {
    // This is the "clock" that everything is rated by.
    var 
      // The tick is the clock-time ... this is different from the
      // _offset which is where we should be in the playlist
      tick = ev.incr('tick'), 
      scrubberPosition = 0;

    // Make sure we aren't the backup player
    if(Player.active && !Player.active.on && Player.active.getVideoBytesLoaded && Player.activeData) {
      var rateStart = 1e10,
          stats,
          dtime,
          ctime, 
          frac;

      if(!isMobile) {
        dtime = Player.active.getDuration() || 0;
        ctime = Player.active.getCurrentTime() || 0;
        frac = Player.active.getVideoLoadedFraction() || 0;
        stats = [
          dtime.toFixed(3),
          ctime.toFixed(3),
          Player.activeData.length,

          Player.active.getPlayerState(),

          // How far in
          (
            Player.active.getCurrentTime() / 
            Player.active.getDuration() 
          ).toFixed(3),

          // How much do we have
          frac.toFixed(3)
        ];

        debug(stats);
      }
    } else {
      try {
      } catch(ex) {
        log(Player.active, ex);
        debug([ "(backup) - failure" ]);
      }
    }

    // The mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      localStorage[ev.db.id + 'offset'] = _offset;

      var time = Player.active.getCurrentTime(),
          prevOffset = _offset;

      if (time > 0 && Player.activeData) {

        // This generates the scrubber in the results tab below.
        // We first check to see if the video is in the viewport window
        if(Results.viewable[Player.activeData.ytid]) {
          // And if so we get its dom and other necessary things.
          var entry = Results.viewable[Player.activeData.ytid];

          // If we are in the purview of the track, then we can move on.
          // Otherwise, place ourselves underneath it so that the percentage
          // calculations will work out.
          scrubberPosition = time * 100 / Player.active.getDuration();
          if(Scrubber.real.attach(entry.jquery.timeline)) {
            entry.jquery.timeline.css('display','block');
          }
        } else {
          Scrubber.real.remove();
        }

        // For some reason it appears that this value can
        // toggle back to different quality sometimes. So 
        // we check to see where it's at.
        if( Player.active.getPlaybackQuality() != _quality) {
          Player.active.setPlaybackQuality(_quality);
        }

        // There's this YouTube bug (2013/05/11) that can sometimes report 
        // totally incorrect values for the duration. If it's more than 
        // 20 seconds off and greater than 0, then we try to reload the 
        // video. This bug seems to have been around for almost a year or 
        // so?  Simply loading the video again appears to fix it.
        if(Player.active.getDuration() > 30 && (Player.active.getDuration() + 20 < Player.activeData.length)) {
          UserHistory.reload();
          debug("reload " + new Date());
        }

        // If the player is active and we are at the end of a song, then move ahead.
        if(time > 0 && Player.active.getDuration() > 0 && (Player.active.getDuration() - time <= 0)) {
          _offset += 1;
          debug("seeking " + new Date());
          Timeline.seekTo(_offset);
        } else {
          _offset = Player.activeData.offset + time;
        }

        // If we are supposed to be playing
        if (_isPlaying) {

          // And we haven't moved forward 
          if (_offset - prevOffset == 0) {
            // This means there's been dead-air for a few seconds.
            if ( ev.incr('deadair', CLOCK_FREQ) > RELOAD_THRESHOLD ) {
              UserHistory.reload();
            }
          } else {
            // this means we are playing so we should increment the total
            // time we are listening
            Player.listen_total += CLOCK_FREQ / 1000;
          }
        }
      }
    }
    Scrubber.real.dom.css({ left: scrubberPosition + "%"});
  }

  _.each(Player.eventList, function(what) {
    self['ytDebug_' + what] = function(that) {
      ev.set("yt-" + what, that);
      log(what, that);
    }
  });

  function ytDebugHook() {
    _.each(Player.eventList, function(what) {
      Player.controls.addEventListener("on" + what, 'ytDebug_' + what);
    });
  }

  self.onYouTubePlayerAPIReady = function() {
    Player.controls = new YT.Player('player-iframe', {
      height: '390',
      width: '640'
    });

    when(function(){
      return Player.controls.loadVideoById;
    }).run(function(){
      ytDebugHook();
      Player.active = Player.controls;
      setInterval(updateytplayer, CLOCK_FREQ);
      ev.set('player_load'); 
    });
  }

  // When the player is loaded all the way
  // then we can set the first player to be called
  // the active player, which is the one that we will
  // use for the most part.
  //
  // This is also when we start our polling function
  // that updates the scrubber and the status of
  // where we currently are.
  ev('app_state', function(value) {
    if (value == 'main') {
      _totalRuntime = Utils.runtime(_db.byId);

      var myoffset = localStorage[ev.db.id + 'offset'];
      if(myoffset) {
        Timeline.seekTo(myoffset);
      } else {
        Timeline.seekTo((0.001 * (-_epoch + (+new Date()))) % _totalRuntime);
      }

      ev.isset("player_load", Results.scrollTo);
    }
  });

  // If there's an error loading the video (usually due to
  // embed restrictions), we have a backup player that can
  // be used.  There's significantly less control over this
  // player so it's the backup plan.
  ev('yt-Error', function(what) {
    log("yt-error", what);
    if(what == 100) {
      Toolbar.status("Video not working; skipping");

      replace(Timeline.current().id, true);

      Timeline.next();
    } else if(what != 150) {
      //_backup.on();
    } else {
      Toolbar.status("Copyright issue; skipping");

      // set the current track as unplayable
      remote('updateTrack', Timeline.current().ytid, 'playable', false);
      Timeline.next();
    }
  });

  ev('volume', function(volume){
    Toolbar.status("Set volume to " + volume.toFixed());
    Player.active.setVolume(volume);
  });

  self.Player = Player;

  return {
    player: Player,
    backup: _backup,

    load: function(id) {
      ev('app_state', 'main');
      Store.get(id);
    },

    // the current track
    current: function() {
      return Player.activeData;
    },

    remove: function(ytid){
      var obj = _db.findFirst('ytid', ytid);

      Toolbar.status("Removed " + obj.title);
      Scrubber.real.remove();

      // we should store that it was removed
      ev.setadd('blacklist', obj.ytid);
      _db.find('ytid', obj.ytid).remove();

      Timeline.updateOffset();
      Store.saveTracks();

      ev.set('request_gen', {force: true});
    },

    pause: function(){
      ev.isset('player_load', function(){
        _isPlaying = false;
        Player.active.pauseVideo();
        $("#pause-play").html('<i class="fa fa-play"></i>');
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

      _totalRuntime = Utils.runtime(_db.byId);

      for(index in _db.byId) {
        if(prevIndex !== false) {
          _db.byId[prevIndex].next = index;
          _db.byId[index].previous = prevIndex;
        }

        prevIndex = index;
        _db.byId[index].offset = aggregate;
        aggregate += (parseInt(_db.byId[index].length) || 0);
      }
      // This final next pointer will enable wraparound
      if(index) {
        _db.byId[index].next = 0;

        // TODO: Sometimes _db.byId[0] is undefined. I have to figure out
        // how this offset problem occurs.
        for(var ix = 0; !_db.byId[ix]; ix++); 

        _db.byId[ix].previous = index;
      }
    },

    play: function(dbid, offset) {
      if(_.isString(dbid)) {
        dbid = _db.current.findFirst({ytid: dbid}).id;
      }
      if(!arguments.length) {
        return Player.Play();
      }

      offset = offset || 0;

      // Only run when the controller has been loaded
      ev.isset('player_load', function(){
        if(!_db.byId[dbid]) {
          Timeline.pause();
        } else if(Player.activeData != _db.byId[dbid]) {
          // NOTE:
          //
          // This is the only entry point for loading and playing a video
          // There are other references to playing and pausing, but this 
          // is the only line that activley loads the id and offset into
          // the player. This is because there has to be an activeData in
          // order to go forward.
          if(Player.activeData) {
            // Increment this count by 1 -- we only want to do it on the case of moving to a new track.
            // This is so there's no misreporting of average listen time of view count based on the reloads
            // that happen during development
            var duration_listened = parseInt(Player.listen_total, 10);
            // if it's zero, we listened to none of it, so we should ignore it.
            if(duration_listened > 0) {
              remote('addListen', Player.activeData.ytid);
              remote('updateDuration', Player.activeData.ytid, duration_listened);
            }
          }
          Player.activeData = _db.byId[dbid];
          Player.listen_total = 0;
          
          // After the assignment, then we add it to the userhistory
          UserHistory.view(Player.active, Player.activeData.ytid, offset);

          // At this point there is now active data, so anything depending
          // on that can run.
          ev('active_track', Player.activeData);
          ev.set('active_data');

          Player.Play();
          log("Playing ", Player.activeData.ytid, Player.activeData.title);
        } else {
          Timeline.seekTo(offset, {isTrackRelative:true});
        }
      });
    },

    next: function(){
      Timeline.seekTo(_db.byId[Player.activeData.next].offset + 1);
      Scrubber.real.dom.css({ left: 0 });
    },
    prev: function(){ 
      Timeline.seekTo(_db.byId[Player.activeData.previous].offset + 1);
      Scrubber.real.dom.css({ left: 0 });
    },
    seekTo: function(offset, opts) {
      opts = opts || {};
      if(!offset) {
        offset = _offset;
      }
      if (opts.isTrackRelative) {
        offset += Player.activeData.offset;
      }
      if (opts.isOffsetRelative) {
        offset += _offset;
      }

      Timeline.updateOffset();

      // If it's between 0 and 1, we assume it's a relative offset ... otherwise we
      // take it as the absolute; and we modulus it by the runtime to permit wrap-around
      var absolute = ((offset < 1) ? offset * _totalRuntime : offset) % _totalRuntime;

      absolute = Math.max(0, absolute);
      absolute = Math.min(_totalRuntime, absolute);
      log("Seeking to " + absolute);

      var track = _db.current.findFirst(function(row) { 
        return (row.offset < absolute && (row.offset + row.length) > absolute) 
      });
      if(!track) {
        track = _db.current.findFirst();
      }

      log("Playing ", track);

      if(track) {
        if(!Player.activeData || (track.id != Player.activeData.id)) {
          Timeline.play(track.id, absolute - track.offset);
        } else {
          Player.offset = absolute - track.offset;
          Player.active.seekTo(absolute - track.offset);

          // TODO: This feels like a bad place to do this.
          ev.set('deadair', 0);
        }
      }
    },

    debug: function() {
      var stats = {};
      _.each([
        'getAvailablePlaybackRates',
        'getAvailableQualityLevels',
        'getCurrentTime',
        'getDuration',
        'getPlaybackQuality',
        'getPlaybackRate',
        'getPlayerState',
        'getVideoBytesLoaded',
        'getVideoBytesTotal',
        'getVideoEmbedCode',
        'getVideoLoadedFraction',
        'getVideoStartBytes',
        'getVideoUrl',
        'getVolume',
        'isMuted'
      ], function(what){
        stats[what] = Player.active[what]();
      });
      log(stats);
    },

    init: function() {
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/player_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // This doesn't reflect the filtered view ... it would be nice to know what the
      // "previous" and "next" track is effeciently with a filter.
      // The controls in the upper left of the timeline
      $("#previous-track").click(Timeline.prev);
      $("#next-track").click(Timeline.next);
      $("#pause-play").click(Timeline.pauseplay);

      $("#quality-down").click(Player.Quality.down);
      $("#quality-up").click(Player.Quality.up);
    }
  };
})();

