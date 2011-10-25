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

  $.post('api/playlist.php', opts, function(ret) {
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
        ev({
          'app.state': 'main',
          'playlist.name': data.name,
          'playlist.id': data.id,
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
  if(meta.old && ev('playlist.id')) {

    data = _.map(data, function(m) {
      var copy = _.clone(m);
      delete copy.container;
      copy.reference = [];
      return copy;
    });

    ev('remote.data', {data: JSON.stringify(data)}); 
  }
});

ev('playlist.name', function(data, meta) {
  if(ev('playlist.id')) {
    remote({
      func: 'update',
      id: ev('playlist.id'),
      name: data
    });
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

