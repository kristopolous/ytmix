var Flash = {
  detect: function() {
    var hasFlash = false;
    try {
      var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      if (fo) {
        hasFlash = true;
      }
    } catch (e) {
      if (navigator.mimeTypes
          && navigator.mimeTypes['application/x-shockwave-flash'] != undefined
          && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
        hasFlash = true;
      }
    }
    return hasFlash;
  },

  init: function() {
    var id = 0;

    self.onYouTubePlayerReady = function(playerId) {
      Player.controls[id] = document.getElementById(playerId);

      ytDebugHook(id);

      ev.set('player_load'); 
    }

    $("<div id=vidContainer-" + id + ">").appendTo("#players");

    swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
      "version=3&enablejsapi=1&playerapiid=player-" + id,
      "vidContainer-" + id, "300", "200", "9", null, null, 
      {allowScriptAccess: "always"}, {id: 'player-' + id});
  }
};
