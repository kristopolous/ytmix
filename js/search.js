
var Search = {
  _useNet: false,
  _id: 0,

  isLink: function(what) {
    return what.indexOf('youtube.com') !== -1;
  },

  // Search for videos from the net given a string.
  net: function(query) {
    var isLink = Search.isLink(query);
    remote('query', ++Search._id, query, function(res) {
      // add the method of this search string being the
      // way these were found
      ev.isset('id', function(){

        if(isLink) {
          query = query.split('=').pop();
        }
        Store.addMethod('q:' + query, function(id) {
          // inject the id into all the results.
          _db.insert(res.vidList).update({method: id});
          Store.saveTracks();
          ev.set('request_gen', {force: true});
          // we need to redo the search
          ev.fire('search_query');
          if(isLink) {
            Search.clear();
          }
        })
      });
    });
  },
  reset: function() {
    _db.byId = _db.ALL;
    _db.current = _db;
    Timeline.updateOffset();
    //log("search reset");
  },
  sort: function(what) {
    what = what || 'artist';
    if(what === 'title') {
      _db.update(function(row) {
        if(!row._title) {
          // we dump opening non-words and actually, you know what, fuck it, it's gotta be a word.
          // fuck spaces ... those are sure to give false positives. This is a sort term not a display
          // term.
          var _title = Results.split(row.title).join('');
          row._title = _title.toLowerCase().replace(/[^\w]*/g,'');
        }
      });
      what = '_title';
    }
    var sorted = _db.sort('_lcartist');
    Search.index(sorted);
    return sorted;
  },
  index: function(subset) {
    var id = 0;
    if(subset) {
      _db.current = DB( 
        DB.copy(subset)
      );
    }
    _db.current.update(function(m) {
      m.id = id++;
    });
    _db.byId = _db.current.view('id');
    Timeline.updateOffset();
  },
  artist: function(who) {
    $("#normal-search").val(who);
  },
  related: function(ytid) {
    if(!_.isString(ytid)) {
      ytid = Timeline.current().ytid;
    }
    loadRelated( _db.findFirst('ytid', ytid) );
  },
  clear: function(){
    ev('search_query', '');
    $("#normal-search").val('');
  },
  init: function(){
    var 
      lastSearch = '', 
      input = $("#normal-search"),

      // These indexes make sure that we don't generate old search results
      // that may have asynchronously came in later than newer ones
      searchID = 0, 
      lastID = 0;

    Utils.onEnter("#initial-search", function(){
      ev('app_state', 'main');

      // make it so that we're using the net.
      Search._useNet = true;
    });

    input.focus(function(){ this.select(); });

    function ui(query) {
      $("#use-internet")[((query.length === 0) ? 'add' : 'remove') + 'Class']('disabled');
    }
    // We probe to see if the search query has changed.
    // And if so we instantiate an image based on that
    // Similar to google instant and ytinstant.
    setInterval(function(){
      var query = input.val();

      if(query != lastSearch) {
        ev('search_query', query);
        lastSearch = query;
        if(Search.isLink(query)) {
          Search._useNet = true;
        } else {
          ui(query);
        }
      }

      if(Search._useNet) {
        Search.net(ev('search_query'));
        Search._useNet = false;
      }
      
    }, 250);
    ui(input.val());
  
    $("#use-internet").click(function(){
      Search._useNet = true;
    });

    $('initial-search').focus();

    $("#sort").click(function(){
      if(ev.toggle('sort')) {
        Search.sort();
      } else {
        Search.reset();
      }
      Results.gen({force: true});
      Results.scrollTo();
    });

    ev.after('tracklist', function() {
      if(ev('sort')) {
        Search.sort();
      }
    });
  }
};

// Loads the videos related to a db object that
// should have ytid defined.  It is also designed
// so it doesn't hose the serve with a bunch of
// requests but instead tries to space them out
// so that one finishes, some time lapses, then
// another one starts.
//
// The related videos for the playlist are stored
// as the database object which has the problem
// of related videos becoming stale and delisted,
// as of now (2011/11/27) unsolved, but it avoids
// the problem of having to have this stagnant
// request cycle every time a user tries to load
// the playlist for his or her own use.
//
// Stale links should be taken care of OOB and not
// be a deferred problem that justifies funky looking
// incremental loads.
//
function loadRelated(obj, opts){
  //console.log(obj, opts);
  var match = _db.findFirst({ytid: obj.ytid});
  
  // The related entry will be null (see the template in
  // _init_.js for more info) unless this call is made
  if(
      !match.related || 
      !match.related.length
    ) {

    Toolbar.status("Adding Related: " + match.title);

    // The match happens to be the same as the server
    // query in this case
    //console.log('related', match.ytid);
    remote.prioritize('related', match.ytid, 
      function (data){

      var ytidList = _.pluck(data.related, 'ytid');

      // insert each related video into our
      // db of known videos if needed
      //
      // this list of related videos doesn't have the
      // duration of the video, only the id.
      Store.addMethod('r:' + obj.ytid, function(id) {

        // we need to make sure we only insert new things
        log("method added: " + id);
        var 
          tempDB = DB(data.related),
          ytList = tempDB.select('ytid');

        // this will be the list of the new ytids
        var newIdList = _.difference(
            ytList,
            _db.find({ytid: ytList}).select('ytid')
          ), 
          newVids = tempDB.find({ytid: newIdList});

        if(newVids.length) {
          var stuff = Utils
            .insertAfter(match, newVids)
            .update({method: id});

          log(stuff);
          // Here we find the duration of the videos
          getDuration(ytidList, function(){

            Store.saveTracks();
            ev.set('request_gen');

          });
        } else {
          log("All related videos have already been added");
        }
      });
    });
  } 
}

ev({
  'search_related': function(list) {
    if(list.length) {
      $("#search-context-title")
        .css('display','inline-block')
        .html("related&#9660;");
    } else {
      $("#search-context-title").css('display','none');
    }
  }
});
