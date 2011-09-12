$(function(){
  var 
    lastSearch = '', 
    searchID = 0, 
    lastID = 0;

  Utils.onEnter(".search", function(){
    search(this.value);
  });

  $("#normal-search").focus(function(){
    this.select();
  });

  setInterval(function(){
    var query = $("#normal-search").val();

    if(query != lastSearch) {
      lastSearch = query;

      // gen({query: query});

      $.getJSON('api/ytsearch.php', { 
          id: ++searchID,
          q: query
        }, function(res) {

        if(res.id < lastID) {
          return;
        }

        lastID = res.id;

        var instance;

        $("#search-results").children().remove();

        for(var ix = 0; ix < res.vidList.length; ix++) {
          instance = res.vidList[ix];

          addVideo(_.extend(
            {container: "#search-results"},
            instance
          ));
        }
      });
    }
  }, 650);
});

function search(query) {
  ev.set('app.state', 'main');

  Local.create();

  if(query.slice(0,5).toLowerCase() == 'http:') {
    var parts = query.split(/[\.=&#?]/);

    for(var ix = 0, len = parts.length; ix < len; ix++){

      if(parts[ix] == 'v') {

        loadit(parts[ix + 1]);
        return;
      }
    }
  } else {
    $("#normal-search").val(query);
    return;
  }

	if(query.length == 0) {
		query = false;
	  gen();
  } else {
    if(!serverSearched[query]) {
      serverSearched[query] = true;

      $.getJSON('api/yt_search.php',
        {q: query}, 
        function(data) {
          serverSearched[query] = _.map(data, function(which) {
            return which[1];
          });

          addVids(data);
          gen();
        });
    }
  }
}
