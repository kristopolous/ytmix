

      // I don't think this actually gets run, regardless of
      // what YT's official documentation says.
      Player.controls[id].addEventListener('onStateChange', function(){ 
        console.log(this, arguments); 
      });

  function swap(x, y) {
    if(_data[y]) {

      TimeDB.update(function(row) {
        if(row.id == x) {
          row.id = y;
        } else if (row.id == y) {
          row.id = x;
        }
      });

      Timeline.updateOffset();
      Timeline.build();
      if(Player.activeData.id == x || Player.activeData.id == y) {
        Timeline.seekTo(_offset);
      }
    }
  }

    toStore: function(){
      var store = [];

      TimeDB
        .find()
        .sort('id', 'asc')
        .each(function(which) {
          store.push({
            length: which.length,
            title: which.title,
            ytid: which.ytid
          })
        });

      return store;
    },
    $(window).keyup(function(e) {
      if(!keyListen) { return }

      switch(e.which) {
        case 37: Timeline.seekTo(_offset - 60); break;
        case 46: Timeline.remove(Player.activeData); break;
        case 39: Timeline.seekTo(_offset + 60); break;
      }
    });
var User = {
  init: function(){
      /*
      if(!ev.isset('uid')) {
        remote({
          func: 'getUser',
          onSuccess: function(uid) {
            ev('uid', uid);
          }
        });
      }
    */
  }
};
