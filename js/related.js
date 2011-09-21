
function sort(mode, el) {
	sortOrder = mode;

	$(el)
    .addClass('selected')
    .siblings()
    .removeClass('selected');

	gen();
}

// Adds vids in the format 
// {length: sec, title: text, ytid: youtube id}
function addVids(vidList, backref) {
  // insert each related video into our
  // db of known videos if needed
  _.each(vidList, function(video) {
    db.insert(video).update(function(data){

      if(! data.reference) {
        data.reference = [];
      }

      data.reference.push(backref.ytid);
      data.removed = data.removed || 0;
    });
  })
}

function loadit(obj, opts){
  var match = {ytid: obj.ytid};
  
  ev.isset('flash.load', function(){
    db.insert(obj);
    Timeline.add(obj, opts);

    if(!db.findFirst(match).serverData) {
      $.getJSON( 'api/related.php', match, function (data){
        db
          .find(match)
          .update({
            removed: 0,
            related: _.pluck(data.related, 'ytid'),
            serverData: data
          });

        addVids(data.related, obj);
    
        gen();
      });
    } 
  });
}
