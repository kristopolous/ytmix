
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
  function remove(ytid) {
    // This track was just removed from the timeline.
    // This means that we need to removed it from the
    // data view of the timeline and reflect the fact
    // that it was removed in the larger database.
    /*
    db.find('ytid', ytid)
      .update(function(obj){
        // increment the announcement that 
        // this was removed at some point and
        // may not be liked
        obj.removed++;

        if(obj.related) {
          db
            .find('ytid', db.isin(obj.related))
            .update(function(record){
              record.reference = _.without(record.reference, ytid);
            });
        }
      });

    db.find({reference: function(field) {
      return field.length == 0;
    }}).remove();

    var removed = db.remove({id: index});

    if(removed.length) {
      if(removed[0].offset < _offset) {
        _offset -= removed[0].length;
        Timeline.seekTo(_offset);
      } else {
        Timeline.updateOffset();
      }
    }
    */
  };
