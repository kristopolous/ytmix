var Desktop = { 
  init: function(){
    Desktop.functions();
    var KEY = {
      disable: false,
      space: 32,
      up: 38,
      down: 40,
      right: 39, 
      left: 37,
      '1': 49,
      '9': 57
    };
    $(window).keydown( function(ev) {
      var kc = ev.keyCode;
      if(ev.ctrlKey) {
        if(kc == KEY.up) { volumeUp(); }
        else if(kc == KEY.down) { volumeDown(); }
        else if(kc == KEY.right) { Timeline.next(); }
        else if(kc == KEY.left) { Timeline.prev(); }
        else if(kc == KEY.space) { Timeline.pauseplay(); }
        else log(ev);
      } else if (!KEY.disable) {
        if(kc == KEY.left) { Timeline.seekTo(-30, {isOffsetRelative:true}); }
        else if(kc == KEY.right) { Timeline.seekTo(30, {isOffsetRelative:true}); }
        else if(kc >= KEY['1'] && kc <= KEY['9']) {
          // Go to x% into the track with 1 = 0% and 9 = 90%
          console.log((kc - KEY['1']) / 9 * Player.activeData.length, {isTrackRelative: true});
          Timeline.seekTo((kc - KEY['1']) / 9 * Player.activeData.length + 0.5, {isTrackRelative: true});
        }
      }
    });
    ev.test('volume', function(what, cb) {
      $("#volume-down")[
        (what <= 0 ? 'add' : 'remove' ) + "Class"
      ]('disabled');

      $("#volume-up")[
        (what >= 100 ? 'add' : 'remove') + "Class"
      ]('disabled');

      cb(what >= 0 && what <= 100);
    });

    $("#volume-down").click(volumeDown);
    $("#volume-up").click(volumeUp);

    Scrubber.phantom.dom.click(function() {
      console.log( Scrubber.phantom.offset);
      var entry = _db.findFirst({ ytid: Scrubber.phantom.id });
      Timeline.play(Scrubber.phantom.id, entry.length * Scrubber.phantom.offset);
    });

    $("#normal-search")
      .focus(function(){ KEY.disable = true; })
      .blur(function(){ KEY.disable = false; });
  }
};

Desktop.functions = function(){ 
  self.volumeUp = function() { ev.mod("volume", "*(11/10)"); }
  self.volumeDown = function() { ev.mod("volume", "*(10/11)"); }
  self.ytButton = function(el) {
    $(el)
      .val('youtube-dl --no-mtime -f 140 -t -- ' + ev('active_track').ytid)
      .select();

    document.execCommand('copy');

    $(el)
      .val('Youtube-dl')
      .blur();

    Toolbar.status("Copied " + ev('active_track').title + " to clipboard");
  }
}

