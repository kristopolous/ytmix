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
    ret = JSON.parse(ret);

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
  }, 'text');

  return reqID;
}

var Store = {
  get: function(id) {
    return remote({
      func: 'get',
      id: id,
      onSuccess: function(data) {
        ev({
          'app_state': 'main',
          'playlist_name': data.name,
          'playlist_id': data.id,
          'playlist_tracks': JSON.parse(data.tracklist)
        });
      }
    });
  },

  saveTracks: function(){
    var remote_keys = [
      'length',     // Duration of the track
      'title',      // YT title
      'id',
      'ytid'       // YT id after watch?
    ];

    ev(
     'playlist_tracks', 
      DB.objectify(
        remote_keys,
        db.find().select(remote_keys)
      )
    );
  },

  remove: function(id) {
    return remote({ 
      func: 'remove',
      id: id
    });
  }
};

ev.setter('playlist_id', function(){
  remote({
    func: 'createID',
    onSuccess: function(id) {
      ev({
        'playlist_id': id,
        'playlist_name': 'no name'
      });
    }
  });
});

// Update the table with new data given
// an assumed index that had been previously
// set
ev({
  'playlist_tracks': function(data, meta) { 
    if(meta.old && ev('playlist_id')) {
      ev('remote_data', {data: JSON.stringify(data)}); 
    }
  },

  'playlist_name': function(data, meta) {
    if(meta.old && ev('playlist_id')) {
      remote({
        func: 'update',
        id: ev('playlist_id'),
        name: data
      });
    }
  }
});

ev.setter('recent', function(){
  remote({
    func: 'recent',
    onSuccess: function(data) {
      data = _.without(data, false);
      each(data, function(which) {
        if(which.preview.constructor == String) {
          which.preview = JSON.parse(which.preview);
        }
        which.count = which.preview.count;
      });
      ev('recent', data);
    }   
  });
});

setInterval(function(){
  if(ev.isset('remote_data')) {

    remote(extend({ 
      func: 'update' ,
      id: ev('playlist_id')
    }, ev('remote_data')));

    ev.unset('remote_data');
  }
}, 4000);

