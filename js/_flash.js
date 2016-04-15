var Flash = {
  init: function() {
    self.onYouTubePlayerReady = function(playerId) {
      var id = parseInt(playerId.substr(-1));

      if(_loaded < _maxPlayer) {
        _loaded ++;

        Player.controls[id] = document.getElementById(playerId);

        ytDebugHook(id);

        if(_loaded == _maxPlayer) {
          // This slight indirection is needed for IE.
          setTimeout(function() { 
            ev.set('player_load'); 
          }, 1);
        }
      }

    }
    for(var ix = 0; ix < _maxPlayer; ix++) {
      $("<div id=vidContainer-" + ix + ">").appendTo("#players");

      swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
        "version=3&enablejsapi=1&playerapiid=player-" + ix,
        "vidContainer-" + ix, "300", "200", "9", null, null, 
        {allowScriptAccess: "always"}, {id: 'player-' + ix});
    }
  }
};
