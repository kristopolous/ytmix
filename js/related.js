
function sort(mode, el) {
	sortOrder = mode;

	$(el)
    .addClass('selected')
    .siblings()
    .removeClass('selected');

	gen();
}

//
// Adds vids in the format
// [ [ytid, title] ... ]
//
function addVids(vidList) {

  // insert each related video into our
  // db of known videos if needed
  _.each(vidList, function(video) {
    db.insert(video).update(function(data){
      try{
        if(!data.reference) {
          data.reference = [];
        }
      } catch(ex) {
        console.log("FAILED >> ", video, data);
      }
      data.count = data.reference.length;

      if(!data.removed) {
        data.removed = 0;
      }
    });
  })
}

function loadit(ytid, opts){
  ev.isset('flash.load', function(){
    if(!db.findFirst({ytid: ytid}).serverData) {

      var id = Timeline.add(ytid, opts);

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
            related: _.pluck(data.related, 'video'),
            serverData: data
          });

          addVids(data.related, opts);
      
          Timeline.update(id);

          gen();
        });
    } else {
      Timeline.add(ytid, opts);
    }
  });
}
