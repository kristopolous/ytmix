var Flash = {
  init: function() {
    for(var ix = 0; ix < _maxPlayer; ix++) {
      $("<div id=vidContainer-" + ix + ">").appendTo("#players");

      swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
        "version=3&enablejsapi=1&playerapiid=player-" + ix,
        "vidContainer-" + ix, "300", "200", "9", null, null, 
        {allowScriptAccess: "always"}, {id: 'player-' + ix});
    }
  }
};
