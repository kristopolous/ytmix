
function sort(mode, el) {
	sortOrder = mode;

	$(el)
    .addClass('selected')
    .siblings()
    .removeClass('selected');

	gen();
}

function loadit(ytid, opts){
  ev.isset('flash.load', function(){
    if(!db.findFirst({ytid: ytid}).serverData) {

      var id = Timeline.add(ytid);

      $.getJSON(
        'api/related.php',
        {v: ytid}, 

        function (data){
          db.insert({
            ytid: ytid
          }).update({
            removed: 0,
            count: 0,
            length: data.length,
            title: Utils.clean(data.title),
            related: _.map(data.related, function(which) {
              return which[1];
            }),
            serverData: data
          });

          addVids(data.related);
      
          Timeline.update(id);

          gen();
        });
    } else {
      Timeline.add(ytid, opts);
    }
  });
}
