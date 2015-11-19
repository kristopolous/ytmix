// This is on the splash page. It loads
// the recent history of tracks that have
// been previously played.
function loadHistory(){
  // The 'recent' has a setter that this will
  // trigger; see store.js.  
  ev.isset(['init', 'recent'], function(data, meta) {
    var row;

    data = ev('recent');

    each(data, function(which, ix) {
      // This is the horizontal row of results.
      // Each row will contain 4 playlist links.
      if(!(ix % 4)) {
        row = $("<div />").addClass("row").appendTo("#splash-history");
      }

      // If there is no preview for this playlist, then skip it.
      if(!which.preview) {
        return;
      }

      var play = $("<img class=play title=" + which.id + " src=img/play.png />")
        .click(function(){
          // Clicking it will switch us to the playlist mode and
          // get the playlist.
          ev('app_state', 'main');
          Store.get(which.id);
        }),
        container = $(
          Splash.template({
            id: which.id,
            ytList: which.preview.tracks ? which.preview.tracks.slice(0, 4) : [],
            title: which.name,
            count: which.preview.count,
            duration: Utils.secondsToTime(which.preview.length)
          })
        );

      container.hover(
        function() { play.fadeIn() },
        function() { play.fadeOut() }
      ).append(play).appendTo(row);
    });

    $("#history").fadeIn();
  });
}

ev({
  // The app_state variable maintains whether the application is
  // at the splash screen or at a specific playlist.  We can check
  // for double fires with the meta.old functions (see evda.js)
  'app_state': function(state, meta) {
    if(state == meta.old) {
      return;
    } 

    if(state == 'splash') {
      // If we go to the splash page ... realistically, "back" to it,
      // then we just force a reload
      if (ev.isset('tracklist')) {
        location.reload();
      } else {
        ev.unset('id','tracklist','name');
        _db.remove();
        Timeline.pause();

        $(".main-app").hide();
        $("#splash").show();

        loadHistory();
        document.body.style.overflow = 'auto';
      }
    } else if (state == 'main') {
      $(".main-app").css({
        opacity: 0,
        display: 'inline-block'
      }).animate({
        opacity: 1
      }, 1000);

      $("#splash").css('display','none');
      document.body.style.overflow = 'hidden';
    }
  },

  'name': function(name, meta) { 
    document.title = name + " on Audisco";
    $("#playlist-name").html(name);

    if(meta.old) {
      remote({
        func: 'update',
        name: name,
        id: ev('id')
      });
    }
  },

  'active_track': function(obj){
    Toolbar.status("Playing " + obj.title);
    ev.set('request_gen');
  },
});

function getDuration(idList, cb) {
  findStatus(idList, function(list) {
    _.each(list, function(row) {
      // duration comes back like PT8M37S
      var parts = _.map(row.contentDetails.duration.slice(2, -1).split(/[A-Z]/), function(m) { return parseInt(m); }),
          duration = parts.pop() + (60 * parts.pop()) + (60 * 60 * (parts.pop() || 0));

      _db.find({ytid: row.id}).update({length: duration});
    });
    if(cb) {
      cb();
    }
  });
}

function findStatus(idList, cb, status) {
  var 
    count = idList.length,
    subgroup,
    current = 0;

  status = status || [];

  subgroup = idList.splice(0, 40);
  $.getJSON("https://www.googleapis.com/youtube/v3/videos?" + [
      "id=" + subgroup.join(','), 
      "part=contentDetails",
      "key=AIzaSyAHtzuv9cF6sdFbIvBWoXhhflxcCFz5qfA"
    ].join('&'), function(res) {
    _.each(res.items, function(row) {
      log("(status) " + row.id);
      status.push( row );
      current++;
    });
    if(current >= count) {
      cb(status);
    } else {
      findStatus(idList, cb, status);
    }
  });
}

function word_cut(what, howmany) {
  return what.split(' ').slice(0, howmany).join(' ');
}

function replace(id, cb, attempt) {
  var 
    vid = _db.findFirst({id: id}),
    replaced = false,

    // do the terms in alphabetical order
    check = replace.clean(vid.title),
    // we alias this for cleanliness,
    check_title = vid.title,
    check_sorted = check.split(' ').sort().join(' '),
    check_wc = check.split(' ').length;

  attempt = attempt || 0;
  if(attempt) {
    check = check.split(' ').slice(0, -1);
    check_wc = check.split(' ').length
  }

  Toolbar.status("Attempting a replace of " + check_title);
  log("[" + (attempt + 1) + "] Replacing (" + id + ") " + check_title);

  remote('query', 1, check, function(resp) {

    if(resp.vidList.length == 0 && check_wc > 2 && attempt != 1) {
      replace(id, cb, 1);
    }
    _.each(resp.vidList, function(what, index) {
      if(replaced) { return; } 

      var 
        attempt = replace.clean(what.title),
        attempt_sorted = attempt.split(' ').sort().join(' '),
        attempt_wc = attempt.split(' ').length,

        // this is our lowest distance of all of our techniques
        distance_lowest, 
        
        // the duration difference between the two in seconds.
        length_difference = Math.abs(vid.length - what.length),
        params,
        cutoff;

      // We check the sorted and unsorted titles and choose the best of the two.
      distance_lowest = Math.min(
        DL([index, "no-truncation", distance_lowest], check_sorted, attempt_sorted),
        DL([index, "no-truncation", distance_lowest], check, attempt)
      );

      // we try to take the best of the three attempts ... the first one uses a
      // sorted set of the words.
      if(distance_lowest > 5) { 

        // the second one makes sure that we are comparing the same amount of words between the two.
        // try again but make the word count match
        if(attempt_wc != check_wc) {
          cutoff = Math.max(Math.min(attempt_wc, check_wc), 3);

          // now we use the same number of words in a truncated manner between the two.
          distance_lowest = Math.min(distance_lowest, 
            DL([index, "words", distance_lowest], word_cut(check, cutoff), word_cut(attempt, cutoff)),
            DL([index, "words", distance_lowest], word_cut(check_sorted, cutoff), word_cut(attempt_sorted, cutoff))
          );
        }

        // If we have a reasonable chance of expecting them to match with a little
        // more effort, then we try to just consider the first X number of characters
        if(distance_lowest < 15) {
          cutoff = Math.max(Math.min(attempt.length, check.length), 18);

          distance_lowest = Math.min(distance_lowest, 
            DL([index, 'chars', distance_lowest], check.slice(0, cutoff), attempt.slice(0, cutoff)),
            DL([index, 'chars', distance_lowest], check_sorted.slice(0, cutoff), attempt_sorted.slice(0, cutoff))
          );
        }
      }

      console.log('final', length_difference, distance_lowest);

      // Essentially what we do is we are more acceptable of video length differences so 
      // long as the titles are more similar to each other.
      if(
        (length_difference < 4   && distance_lowest < 12) ||
        (length_difference < 9   && distance_lowest < 7) ||
        (length_difference < 35  && distance_lowest < 5) ||
        (length_difference < 100 && distance_lowest < 3) ||
        // if the video is longer and has an identical name, we'll be ok with it ... up to
        // 4.5 minutes.
        ((what.length - vid.length) > 0 && (what.length - vid.length) < 270 && distance_lowest < 2)
      ) {
        replaced = true;

        log("Success >> (" + id + ") " + check_title);
        // Keep the old title in case this is a bad match.
        // I don't want to revoke all knowledge of it.
        delete what.title;

        _db.find({id: id})
          .update(what)
          .unset('jqueryObject');

        ev.set('request_gen');
      }
    });
    if(!replaced) {
      log("[" + resp.vidList.length + "] Failure (" + id + ") " + vid.title, resp.url);
    }
    if(cb) {
      if(_.isFunction(cb)) {
        cb(replaced);
      } else {
        replace.cb(replaced);
      }
    }
  });
}

// the default callback
replace.cb = function(success) {
  if(success) {
    Store.saveTracks();
  }
}

replace.clean = function(str) {
  if(str.charAt(str.length - 1) == ')' && str.length > 20) {
    str = str.replace(/\([^\)]*\)$/,'');
  }
  return $.trim(str.replace(/[\-0-9\(\)]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase());
}

// The great db.js... yes it is this awesome.
function updateBlackList () {
  findStatus(_db.find().select('ytid'), function(what) { 
    log(_db.find().select('ytid').length, what.length);
    DB()
      .insert(what)
      .find( DB(".contentDetails.regionRestriction.blocked.indexOf('US') > -1") )
      .each(function(what) {
        log("remove >> ", what.id);
        Timeline.remove(what);
      });
  });
}

function volumeUp() {
  ev.incr("volume", 10);
}

function volumeDown() {
  ev.incr("volume", -10);
}

function ytButton(el) {
  $(el)
    .val('youtube-dl -f 140 -t -- ' + ev('active_track').ytid)
    .select();

  document.execCommand('copy');

  $(el)
    .val('Youtube-dl')
    .blur();

  Toolbar.status("Copied " + ev('active_track').title + " to clipboard");
}

$(function(){
  Splash.template = _.template( $("#T-Preview").html() );
  Results.init();
  Toolbar.init();
  Timeline.init();
  Search.init();

  var KEY = {
    space: 32,
    up: 38,
    down: 40,
    right: 39, 
    left: 37
  };

  $(window).keydown( function(ev) {
    if(ev.ctrlKey) {
      if(ev.keyCode == KEY.up) { volumeUp(); }
      else if(ev.keyCode == KEY.down) { volumeDown(); }
      else if(ev.keyCode == KEY.right) { Timeline.next(); }
      else if(ev.keyCode == KEY.left) { Timeline.prev(); }
      else if(ev.keyCode == KEY.space) { Timeline.pauseplay(); }
      else log(ev);
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

  // User ids for the favorites feature
  ev.setter('uid', function(done){
    if(localStorage['uid']) {
      done(localStorage['uid']);
    } else {
      remote('getUser', done);
    }
  });

  ev.isset('uid', function(uid){
    localStorage['uid'] = uid;
  });

  window.Scrubber = {
    real: { 
      dom: $("#real-scrubber"),
      attach: function(where) {
        if(Scrubber.real.container != where) {
          Scrubber.real.remove();
          Scrubber.real.container = where;
          Scrubber.real.dom.appendTo(where);
          Scrubber.real.container.addClass("active").css('display','block');
          Scrubber.real.container.parent().addClass("active");
        }
        where.css('display','block');
      },
      remove: function() {
        if(Scrubber.real.container) {
          Scrubber.real.container.removeClass("active");
          Scrubber.real.container.parent().removeClass("active");
          Scrubber.real.container = false;
          Scrubber.real.dom.detach().appendTo("#offscreen");
        }
      } },
    phantom: { dom: $("#phantom-scrubber") }
  };
  
  Scrubber.phantom.dom.click(function() {
    var entry = _db.findFirst({ ytid: Scrubber.phantom.id });
    Timeline.play(Scrubber.phantom.id, entry.length * Scrubber.phantom.offset);
  });
  ev.set('init');
copy("anything");
});

