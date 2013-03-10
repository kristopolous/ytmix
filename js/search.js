
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

    $("#clear-search").click(function(){ $("#normal-search").val(''); });

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
  
    _get('initial-search').focus();
  }
};

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
