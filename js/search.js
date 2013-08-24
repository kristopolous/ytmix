
var Search = {
  id: 0,
  net: function(query) {
    $.getJSON('api/ytsearch.php', { 
        id: ++Search.id,
        query: query
      }, function(res) {

      _.each(
        res.vidList,
        Timeline.add
      );

      ev.set('request_gen', {force: true});
    });
  },
  artist: function(who) {
    $("#normal-search").val(who);
  },
  related: function(ytid) {
    loadRelated(db.findFirst('ytid', ytid));
  },
  init: function(){
    var 
      lastSearch = '', 
      input = $("#normal-search"),

      // These indexes make sure that we don't generate old search results
      // that may have asynchronously came in later than newer ones
      searchID = 0, 
      lastID = 0;

    $("#clear-search").click(function(){ 
      $("#normal-search").val(''); 
    });

    Utils.onEnter("#initial-search", function(){
      ev('app_state', 'main');

      input.val(this.value);

      ev.isset('search.results', function(results) { 
        ev.isset('id', function(){
          ev.push('tracklist', results[0]); 
        });
      });
    });

    input.focus(function(){ this.select(); });

    // We probe to see if the search query has changed.
    // And if so we instantiate an image based on that
    // Similar to google instant and ytinstant.
    setInterval(function(){
      var query = input.val();

      if(query != lastSearch) {

        ev('search_query', query);
        lastSearch = query;

      }
    }, 250);
  
    $("#use-internet").click(function(){
      Search.net($("#initial-search").val());
    });

    _get('initial-search').focus();
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
  // make sure we aren't hitting this more than
  // we should be.
  if(_remote.active) {
    _remote.queue.push(function(){
      loadRelated(obj, opts);
    });
    return;
  }

  var match = db.find({ytid: obj.ytid});
  
  // The related entry will be null (see the template in
  // _init_.js for more info) unless this call is made
  if(
      !match[0].related || 
      !match[0].related.length
    ) {

    Toolbar.status("Adding related " + match[0].title);
    // This "mutex like" object is to
    // make sure that we don't request
    // more then one related at a time.
    _remote.active = true;

    // The match happens to be the same as the server
    // query in this case
    $.getJSON( 
      'api/related.php', 
      {ytid: match[0].ytid}, 
      function (data){

      var ytidList = _.pluck(data.related, 'ytid');

      // insert each related video into our
      // db of known videos if needed
      //
      // this list of related videos doesn't have the
      // duration of the video, only the id.
      each(data.related, function(video) {
        db.insert(video).update(function(row){
        });
      })

      match.update({related: ytidList});

      // Here we find the duration of the videos
      getDuration(ytidList, function(){

        Store.saveTracks();
        ev.set('request_gen');

        // This makes sure that we don't hammer
        // the server to get related videos
        setTimeout(function(){
          _remote.active = false;
          _remote.queue.doshift();
        }, 1000);
      });
    });
  } else { 
    _remote.active = false;
    _remote.queue.doshift();
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
