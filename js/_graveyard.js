
  /*
  function build(){
    if(arguments.length) {
      var trackList = arguments[0];

      each(trackList, function(which) {
        db.find('ytid', which.ytid).update({order: which.id});
      });

      Timeline.updateOffset();
      return;
    }

    var trackList = arguments[0] || ev('playlist_tracks') || [];

    each(trackList, function(track, index) {
      if(_order[index] && track.ytid != _order[index].ytid) {
        remove(index);
      }
      if(!_order[index] || track.ytid != _order[index].ytid) {
        //addVids(track);
      }
    });

    each(_order, function(value, index) {
      if(index >= trackList.length) {
        remove(index);
      } else if(value.ytid != trackList[index].ytid) {
        remove(index);
        add(value);
      }
    });
/*
    setTimeout(function(){
      if(Player.activeData) {
        Timeline.seekTo((0.001 * (-_epoch + (+new Date()))) % _totalRuntime);
      }
    }, 3000);
  }
    */

 // ev('playlist_tracks', function(){build();});

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
