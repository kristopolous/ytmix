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

    // convenience function of parsing the results
    for(var key in ret.result) {
      if(_.isString(ret.result[key])) {
        var candidate;
        try {
          candidate = JSON.parse(ret.result[key]);
          ret.result[key] = candidate;
        } catch (ex) { }
      }
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
        ev(
          _.extend(
            { 'app_state': 'main'},
            data
          )
        );
      }
    });
  },

  remoteKeys: [
    'length',     // Duration of the track
    'title',      // YT title
    'ytid'       // YT id after watch?
  ],

  saveTracks: function(){
    ev(
     'tracklist', 
      db.find().select(Store.remoteKeys)
    );
  },

  remove: function(id) {
    return remote({ 
      func: 'remove',
      id: id
    });
  }
};

ev.setter('id', function(){
  remote({
    func: 'createID',
    onSuccess: function(id) {
      ev({
        'id': id,
        'name': 'no name'
      });
    }
  });
});

// Update the table with new data given
// an assumed index that had been previously
// set
ev({
  'blacklist': function(data, meta) {
    if(meta.old && ev('id')) {
      remote({
        func: 'update',
        id: ev('id'),
        blacklist: JSON.stringify(data)
      });
    }
  },
  'tracklist': function(data, meta) { 
    if(meta.old && ev('id')) {
      ev('remote_data', {tracklist: JSON.stringify(data)}); 
    }
  },

  'name': function(data, meta) {
    if(meta.old && ev('id')) {
      remote({
        func: 'update',
        id: ev('id'),
        tracklist: data
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
      id: ev('id')
    }, ev('remote_data')));

    ev.unset('remote_data');
  }
}, 4000);

