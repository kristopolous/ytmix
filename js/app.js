// This is on the splash page. It loads
// the recent history of tracks that have
// been previously played.
function loadHistory(){
  // The 'recent' has a setter that this will
  // trigger; see store.js.  
  ev.isset(['init', 'recent'], function(data, meta) {
    var start = new Date();

    _.each(ev('recent').slice(0, 25), function(which, ix) {
      // If there is no preview for this playlist, then skip it.
      if(!which.preview) {
        return;
      }
      $("#splash-history").append(Template.splash({
        id: which.id,
        ytList: which.preview.tracks,
        title: which.name,
        count: which.preview.count,
        duration: Utils.secondsToTime(which.preview.length)
      }));
    });

    $("#history").show();
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
      if (meta.old) {
        location.reload();
      } else {
        $(".main-app").hide();
        $("#splash").show();

        loadHistory();
        document.body.style.overflow = 'auto';
      }
    } else if (state == 'main') {
      $(".main-app").css('display', 'inline-block');
      $("#splash").css('display','none');
      window.scrollTo(0,0);
      document.body.style.overflow = 'hidden';
    }
  },

  'name': function(name, meta) { 
    document.title = name + " on Audisco";
    console.log(meta);
    if(meta.dom) {
      meta.dom.html(name);
    } else {
      $("#playlist-name").html(name);
    }

    if(meta.old) {
      remote({
        func: 'update',
        name: name,
        id: ev('id')
      });
    }
  }

});

function getDuration(idList, cb) {
  findStatus(idList, function(list) {
    var res = [];
    _.each(list, function(row) {
      // duration comes back like PT8M37S
      var 
        regex,
        raw = row.contentDetails.duration, 
        duration = 0;

      _.each(['H','M','S'], function(what) {
        regex = raw.match(new RegExp("(\\d+)" + what));
        if(regex) {
          duration += parseInt(regex[1], 10);
          if(what !== "S") {
            duration *= 60;
          }
        }
      });

      res.push([row.id, duration]);
      _db.find({ytid: row.id}).update({length: duration});
    });
    if(cb) {
      cb(res);
    }
  });
}

function findStatus(idList, cb, status) {
  var 
    count = idList.length,
    subgroup,
    url,
    current = 0;

  status = status || [];

  if(!AUTH_KEY) {
    console.error("AUTH_KEY from the secrets file needs to be defined. Please look at the github readme");
  }

  subgroup = idList.splice(0, 40);
  url = "https://www.googleapis.com/youtube/v3/videos?" + [
      "id=" + subgroup.join(','), 
      "part=contentDetails",
      "key=" + AUTH_KEY
    ].join('&');

  $.getJSON(url, function(res) {
    _.each(res.items, function(row) {
      log("(status) " + row.id);
      status.push( row );
      current++;
    });
    if(current >= count) {
      cb(status);
    } else {
      // if we are looking for more than what YT allows us, we
      // 'recurse' with the lispian head of the list. 
      findStatus(idList, cb, status);
    }
  });
}

function getMissingDurations() {
  var missing = _db.find(function(row) { return isNaN(row.length) }).select('ytid');
  if(missing.length) {
    getDuration(missing, function(m) { 
      Store.saveTracks();
    });
  }
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

  remote('ytinfo', vid.ytid, function(res) {
    if(res[0] && res[0].snippet) {
      _db.find({id: id}).update({
        title: res[0].snippet.title
      }).unset('jqueryObject');
      Toolbar.status("Updating title");
      ev.set('request_gen',  {force: true});
      Store.saveTracks();
    } else {
      heuristic_search();
    }
  });


  function heuristic_search() {
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


function loadTemplates() {
  $("#template > *").each(function(){
    var id = this.id.slice(2); 
    Template[id] = _.template(this.innerHTML);
    console.log(">> template " + id);
  });
}

var App = {
  init: function() {
    // This has to be done to get the scrollbars of the main box to show.
    Results.resize();
    ev.set('request_gen', {force: true});

    // we do this after
    ev('active_track', function(obj){
      Toolbar.status("Playing " + obj.title);

      // This removes the scrubber from the previous
      ev.set('request_gen');
    });
    ev.set('init');
  }
};

$(function(){
  loadTemplates();
  Results.init();
  Toolbar.init();
  Timeline.init();
  Search.init();

  self.Scrubber = {
    real: { 
      dom: $("#real-scrubber"),
      attach: function(where) {
        var res = false;
        if(Scrubber.real.container != where) {
          Scrubber.real.remove();
          Scrubber.real.container = where;
          Scrubber.real.dom.appendTo(where);
          Scrubber.real.container.addClass("active").css('display','block');
          Scrubber.real.container.parent().addClass("active");
          res = true;
        }
        where.css('display','block');
        return res;
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
  
  if(isMobile) {
    Mobile.init();
  } else {
    Desktop.init();
  }

  // so long as this is non-zero it appears to work.
  // no, false, I don't know what's up with this.
  setTimeout(App.init, 10);
});

