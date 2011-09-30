var _requestID = 0;

function remote(opts) {
  var 
    reqID = _requestID ++,
    onSuccess = opts.onSuccess,
    onFailure = opts.onFailure;

  if(onSuccess) {
    delete opts.onSuccess;
  }

  if(onFailure) {
    delete opts.onFailure;
  }

  $.get('api/playlist.php', opts, function(ret) {
    var meta = {  
      reqID: reqID,
      opts: opts,
      ret: ret
    };

    if(_.isString(ret.status)) {
      ret.status = {
        "true": true,
        "false": false
      }[ret.status];
    }

    if(ret.status === true && onSuccess) {
      onSuccess(ret.result);
    } 

    if(ret.status === false){
      console.log(meta);

      if(onFailure) { 
        onFailure(ret.result);
      }
    }

    ev('remote', meta);
  }, 'json');

  return reqID;
}

var Store = {
  get: function(id) {
    return remote({
      func: 'get',
      id: id,
      onSuccess: function(data) {
      console.log(data);
        ev({
          'app.state': 'main',
          'playlist.id': data.id,
          'playlist.name': data.name,
          'playlist.tracks': JSON.parse(data.tracklist)
        });

        Timeline.play(0);
      }
    });
  },

  remove: function(id) {
    return remote({ 
      func: 'remove',
      id: id
    });
  }
};

ev.setter('playlist.id', function(){
  remote({
    func: 'createID',
    onSuccess: function(id) {
      ev({
        'playlist.id': id,
        'playlist.name': 'no name'
      });
    }
  });
});

// Update the table with new data given
// an assumed index that had been previously
// set
ev('playlist.tracks', function(data, meta) { 
  console.log(data, meta.old);
  if(meta.old && ev('playlist.id')) {
    ev('remote.data', {data: JSON.stringify(data)}); 
  }
});

ev.setter('recent', function(){
  remote({
    func: 'recent',
    onSuccess: function(data) {
      data = _.without(data, false);
      each(data, function(which) {
        which.tracklist = JSON.parse(which.tracklist);
      });
      ev('recent', data);
    }   
  });
});

setInterval(function(){
  if(ev.isset('remote.data')) {

    remote(extend({ 
      func: 'update' ,
      id: ev('playlist.id')
    }, ev('remote.data')));

    ev.unset('remote.data');
  }
}, 4000);

