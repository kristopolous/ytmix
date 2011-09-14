$(function(){
  var 
    lastSearch = '', 
    input = $("#normal-search"),
    searchID = 0, 
    lastID = 0;

  Utils.onEnter("#initial-search", function(){
    ev.set('app.state', 'main');

    Local.create();

    input.val(this.value);
    ev.isset('search.results', function(results) { loadit(results[0]); });
  });

  input.focus(function(){ this.select(); });

  setInterval(function(){
    var query = input.val();

    if(query != lastSearch && query.length) {
      lastSearch = query;

      $.getJSON('api/ytsearch.php', { 
          id: ++searchID,
          query: query
        }, function(res) {

        if(res.id < lastID) { return; }

        lastID = res.id;

        $("#search-results").children().remove();

        ev.emit('search.results', res.vidList);

        _.each(res.vidList, function(video) {
          addVideo(_.extend(
            {container: "#search-results"},
            video
          ));
        });
      });
    }
  }, 650);
});
