// See utils.js for how a queue could ostensibly work.
// At the time of the comment's authorship, it's being
// used just like an array.
_remote.queue = new Queue();

// This is on the splash page. It loads
// the recent history of tracks that have
// been previously played.
function loadHistory(){
  // The 'recent' has a setter that this will
  // trigger; see store.js.  
  ev.isset('recent', function(data) {

    var row;
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

      which.preview = JSON.parse(which.preview);

      var play = $("<img class=play src=css/play.png />")
        .click(function(){
          // Clicking it will switch us to the playlist mode and
          // get the playlist.
          ev('app_state', 'main');
          Store.get(which.id);
        }),
        container = $("<span />")
          .addClass("splash-container")
          .addClass("span3")
          .html(
            Splash.template({
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
        db.find().remove();
        Timeline.pause();
        $(".main-app").css('display','none');
        $("#splash").css('display','block');
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

      db.find({ytid: row.id}).update({length: duration});
    });
    if(cb) {
      cb();
    }
  });
}

function findStatus(idList, cb, status) {
  var count = idList.length,
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
      console.log("(status) " + row.id);
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

function replace(id, cb, attempt) {
  var vid = db.findFirst({id: id}),
    replaced = false,
    check = replace.clean(vid.title),
    wc = check.split(' ').length;

  attempt = attempt || 0;
  if(attempt) {
    check = check.split(' ').slice(0, -1).join(' ');
    wc = check.split(' ').length
  }

  console.log("[" + (attempt + 1) + "] Replacing (" + id + ") " + vid.title);
  $.getJSON("api/entry.php", {func: 'query', query: check}, function(resp) {
    resp = resp.result;
    if(resp.vidList.length == 0) {
      replace(id, cb, 1);
    }
    _.each(resp.vidList, function(what) {
      if(replaced) { return; } 

      var attempt = replace.clean(what.title),
        distance = DL(check, attempt),
        short,
        cutoff,
        attemptWc = attempt.split(' ').length;

      console.log(distance, check, attempt, vid.length, what.length);
      if(distance > 5) { 
        // try again but make the word count match
        if(attemptWc != wc) {
          cutoff = Math.max(Math.min(attemptWc, wc), 3);
          short = [
            check.split(' ').slice(0, cutoff).join(' '),
            attempt.split(' ').slice(0, cutoff).join(' ')
          ];
          distance = DL.apply(this, short);
          console.log("--", distance, cutoff, "words", short[0], ":", short[1]);
        }
        if(distance < 9 && distance > 5) {
          cutoff = Math.max(Math.min(attempt.length, check.length), 18);
          short = [
            check.slice(0, cutoff),
            attempt.slice(0, cutoff)
          ];
          distance = DL.apply(this, short);
          console.log("--", distance, cutoff, "chars", short[0], ":", short[1]);
        }
      }

      if(
        (Math.abs(vid.length - what.length) < 35) ||
        (Math.abs(vid.length - what.length) < 100 && distance < 3)
      ) {
        if(distance < 5) {
          replaced = true;
          console.log("Success >> (" + id + ") " + vid.title);
          // Keep the old title in case this is a bad match.
          // I don't want to revoke all knowledge of it.
          delete what.title;

          db.find({id: id})
            .update(what)
            .unset('jqueryObject');

          ev.set('request_gen');
        }
      }
    });
    if(!replaced) {
      console.log("[" + resp.vidList.length + "] Failure (" + id + ") " + vid.title, resp.url);
    }
    if(cb) {
      cb(replaced);
    }
  });
}

replace.clean = function(str) {
  return str.replace(/[\-0-9\(\)]/g, '').replace(/\./g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

// The great db.js... yes it is this awesome.
function updateBlackList () {
  findStatus(db.find().select('ytid'), function(what) { 
    console.log(db.find().select('ytid').length, what.length);
    DB()
      .insert(what)
      .find( DB(".contentDetails.regionRestriction.blocked.indexOf('US') > -1") )
      .each(function(what) {
        console.log("remove >> ", what.id);
        Timeline.remove(what.id);
      });
  });
}

//
// ytButton initializes the "youtube-dl" button
// to get the copy/pasta for a command line downloading
function ytButton() {
  var clip = new ZeroClipboard.Client();
  ZeroClipboard.setMoviePath("js/min/ZeroClipboard.swf");
  clip.setHandCursor(true);
  clip.glue('clipboard-button', 'clipboard-wrapper');
  $("#ZeroClipboardMovie_1").css('opacity', 0.001);

  // Update the clipboard data when a new track is loaded.
  ev('active_track', function(data) {
    // The ytid is .ytid of the data.
    clip.setText('youtube-dl -t ' + data.ytid);
  });
}

$(function(){
  Splash.template = _.template( $("#T-Preview").html() );
  ev.when('app_state', 'main', ytButton).once = true;
  Results.init();
  Toolbar.init();
  Timeline.init();
  Search.init();

  $("#volume-down").click(function(){
    ev.set("volume", Math.max(ev('volume') - 10, 0));
  });
  $("#volume-up").click(function(){
    ev.set("volume", Math.min(ev('volume') + 10, 100));
  });
  // User ids for the favorites feature
  ev.setter('uid', function(done){
    if(localStorage['uid']) {
      done(localStorage['uid']);
    } else {
      remote({
        func: 'getUser',
        onSuccess: done
      });
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
    var entry = db.findFirst({ ytid: Scrubber.phantom.id });
    Timeline.play(Scrubber.phantom.id, entry.length * Scrubber.phantom.offset);
  });
});

