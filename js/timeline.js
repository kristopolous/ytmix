var UserHistory = {
  isViewed: function(id) {
    return localStorage["v"].search(id) > -1;
  },
  isStarred: function(id) {
    return localStorage["s"].search(id) > -1;
  },
  star: function(id) {
    if(UserHistory.isStarred(id)) {
      localStorage['s'] = localStorage['s'].replace(' ' + id, '');
    } else {
      localStorage["s"] += " " + id;
    }
    ev.set('request_gen', {force: true});
    return UserHistory.isStarred(id);
  },
  getViewed: function(){
    return localStorage['v'].split(' ');
  },
  getFavorites: function(){
    return localStorage['s'].split(' ');
  },
  view: function (object, id, offset) {
    localStorage["v"] += " " + id;

    if(UserHistory.isStarred(id)) {
      $("#is-starred").addClass('active');
    } else {
      $("#is-starred").removeClass('active');
    }

    Player.offset = offset;

    Timeline.backup.off(object).loadVideoById(id, offset);
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

    _data = db.view('id'),
    _maxPlayer = 1,
    _isPlaying = true,
    _loaded = 0,

    _backup = {},
    _template = {},
    _rateWindow = [],

    Player = {
      controls: [],

      eventList: [ 
        'StateChange',
        'PlaybackQualityChange',
        'PlaybackRateChange',
        'Error',
        'ApiChange'
      ],

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

  _backup = {
    start: 0,

    off: function(){
      if(Player.active.off) {
        $("#backupPlayer").html('');
        Player.active = Player.controls[0];
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
        _template.backup({
          offset: Math.floor(Player.offset),
          ytid: Player.activeData.ytid
        })
      );
    },

    getPlaybackQuality: function(){
      return "large";
    },

    on: function() {
      Player.offset = Player.offset || 0;

      Player.active = _backup;
      Player.active.playVideo();
    }
  };

  // This changes the volume down and back up
  // to fix the annoying click sound
  var clickFix = {
    _set: false,
    start: function(){
      if(Player.active) {
        if(Player.active.setVolume) {
          Player.active.setVolume(0);
        }
        clickFix.set = true;
      }
    },
    end: function(){
      if(clickFix.set) {
        setTimeout(function() {
          if(Player.active.setVolume) {
            Player.active.setVolume(ev('volume'));
          }
        }, 500);
        clickFix.set = false;
      }
    }
  };

  function updateytplayer() {
    ev.set('tick');

    var scrubberPosition = 0;

    // Make sure we aren't the backup player
    if(Player.active && !Player.active.on && Player.active.getVideoBytesLoaded && Player.activeData) {
      var rateStart = 1e10,
          stats,
          rateEnd = Player.active.getVideoBytesLoaded();

      stats = [
        Player.active.getDuration(),
        Player.active.getCurrentTime(),
        Player.activeData.length,

        Player.active.getPlayerState(),

        // How far in
        (
          Player.active.getCurrentTime() / 
          Player.active.getDuration() 
        ).toFixed(3),

        // How much do we have
        Player.active.getVideoLoadedFraction().toFixed(3)
      ];

      _rateWindow.push(rateEnd);

      // Update every 150 ms so a 20 unit window is over 3 seconds
      if(_rateWindow.length > 20) {
        rateStart = _rateWindow.shift();
      }

      if(rateStart < rateEnd) {
        stats.push(
          (
            ((rateEnd - rateStart) / 3) / 1024
          ).toFixed(3) + " KBps"
        ); 
      }

      debug(stats);
    } else {
      debug([
        "(backup)", 
        Player.active.getCurrentTime().toFixed(3),
        "/",
        Player.active.getDuration().toFixed(3)
      ]);
    }

    // The mechanics for moving the centroid
    if(Player.active.getCurrentTime) {
      localStorage[ev.db.id + 'offset'] = _offset;

      var time = Player.active.getCurrentTime();

      if (time > 0 && Player.activeData) {

        clickFix.end();

        // This generates the scrubber in the results tab below.
        // We first check to see if the video is in the viewport window
        if(Results.viewable[Player.activeData.ytid]) {
          // And if so we get its dom and other necessary things.
          var entry = Results.viewable[Player.activeData.ytid];

          // If we are in the purview of the track, then we can move on.
          // Otherwise, place ourselves underneath it so that the percentage
          // calculations will work out.
          scrubberPosition = time * 100 / Player.active.getDuration();
          entry.jquery.timeline.css('display','block');
          Scrubber.real.attach(entry.jquery.timeline);
        } else {
          Scrubber.real.remove();
        }

        // For some reason it appears that this value can
        // toggle back to non-high quality sometimes. So 
        // we check to see where it's at.
        if( Player.active.getPlaybackQuality() != 'large') {
          Player.active.setPlaybackQuality('large');
        }

        // There's this YouTube bug (2013/05/11) that can sometimes report 
        // totally incorrect values for the duration. If it's more than 
        // 20 seconds off and greater than 0, then we try to reload the 
        // video. This bug seems to have been around for almost a year or 
        // so?  Simply loading the video again appears to fix it.
        if(Player.active.getDuration() > 30 && (Player.active.getDuration() + 20 < Player.activeData.length)) {
          console.log("Reloading");
          UserHistory.view(Player.active, Player.activeData.ytid, Player.active.getCurrentTime());
        }

        // If the player is active and we are at the end of a song, then move ahead.
        if(time > 0 && Player.active.getDuration() > 0 && (Player.active.getDuration() - time <= 0)) {
          _offset += 1;
          Timeline.seekTo(_offset);
        } else {
          _offset = Player.activeData.offset + time;
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

  // If there's an error loading the video (usually due to
  // embed restrictions), we have a backup player that can
  // be used.  There's significantly less control over this
  // player so it's the backup plan.
  ev.on('yt-Error', function(what) {
    console.log("yt-error", what);
    if(what != 150) {
      _backup.on();
    }
  });

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));

    if(_loaded < _maxPlayer) {
      _loaded ++;

      Player.controls[id] = document.getElementById(playerId);

      _.each(Player.eventList, function(what) {
        Player.controls[id].addEventListener("on" + what, 'ytDebug_' + what);
      });

      if(_loaded == _maxPlayer) {
        // This slight indirection is needed for IE.
        setTimeout(function() { 
          ev.set('flash_load'); 
        }, 1);
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

      var myoffset = localStorage[ev.db.id + 'offset'];
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

  ev('volume', function(volume){
    Toolbar.status("Set volume to " + volume);
    Player.active.setVolume(volume);
  });

  self.Player = Player;
  return {
    player: Player,
    data: _data,
    backup: _backup,

    remove: function(index){
      if(_.isString(index)) {
        index = db.findFirst({ytid: index}).id;
        log(index);
      }

      if(! _data[index]) {
        log("Unable to remove>> " + index);
        return;
      }
      Toolbar.status("Removed " + _data[index].title);
      Scrubber.real.remove();

      // we should store that it was removed
      ev.setadd('blacklist', _data[index].ytid);
      db.find('ytid', _data[index].ytid).remove();
      Timeline.updateOffset();
      Store.saveTracks();
      ev.set('request_gen', {force: true});
    },

    pause: function(){
      ev.isset('flash_load', function(){
        _isPlaying = false;
        Player.active.pauseVideo();
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

        // TODO: Sometimes _data[0] is undefined. I have to figure out
        // how this offset problem occurs.
        for(var ix = 0; !_data[ix]; ix++); 

        _data[ix].previous = index;
      }
      // db.sync();
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
          // NOTE:
          //
          // This is the only entry point for loading and playing a video
          // There are other references to playing and pausing, but this 
          // is the only line that activley loads the id and offset into
          // the player. This is because there has to be an activeData in
          // order to go forward.
          Player.activeData = _data[dbid];
          
          // After the assignment, then we add it to the userhistory
          UserHistory.view(Player.active, Player.activeData.ytid, offset);

          // At this point there is now active data, so anything depending
          // on that can run.
          ev('active_track', Player.activeData);
          ev.set('active_data');

          Player.Play();
          log("Playing ", Player.activeData.ytid, Player.activeData.title);
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
        clickFix.start();
        if(!Player.activeData || (track.id != Player.activeData.id)) {
          Timeline.play(track.id, absolute - track.offset);
        } else {
          Player.offset = absolute - track.offset;
          Player.active.seekTo(absolute - track.offset);
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
      console.log(stats);
    },

    init: function() {

      _template.backup = _.template($("#T-Backup").html());

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
        Timeline.seekTo(_data[Player.activeData.previous].offset + 1);
      });

      $("#next-track").click(function(){
        Timeline.seekTo(_data[Player.activeData.next].offset + 1);
      });

      $("#pause-play").click(Timeline.pauseplay);

      $("#is-starred").click(function(){
        UserHistory.star(Player.activeData.ytid);
        $(this).toggleClass('active');
      })
    }
  };
})();

