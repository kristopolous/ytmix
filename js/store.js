function remote(opts) {
  if(remote.lock) {
    log("deferring. Queue size:", remote.queue.length);
    remote.queue.push(arguments);
    return;
  }

  remote.lock = true;
  
  var 
    reqID = remote.id ++,
    onSuccess,
    onFailure;

  // This is the array way of calling things.
  if(_.isString(opts)) {
    var list = slice.call(arguments);
    opts = {};

    // the success function is the last thing
    onSuccess = list.pop();

    ["func", "id", "param"].forEach(function(which) {
      if(list) {
        opts[which] = list.shift();
      }
    })

  } else {
    onFailure = opts.onFailure;
    onSuccess = opts.onSuccess;
  }

  if(onSuccess) {
    delete opts.onSuccess;
  }

  if(onFailure) {
    delete opts.onFailure;
  }

  $.post('api/entry.php', opts, function(ret) {

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
  }, 'text')
    .always(function() {
      setTimeout(function(){
        remote.lock = false;
        if(remote.queue.length) {
          log("Queue pop!", remote.queue.length);
          remote.apply(0, remote.queue.shift());
        }
      }, 100);
    });

  return reqID;
}
remote.queue = [];
remote.id = 0;

var Store = {
  //
  // *****************************
  //  THIS IS THE PLAYLIST LOADER 
  // *****************************
  //
  get: function(id) {
    return remote('get', id, function(data) {
      console.log(data);
      if(!data.blacklist) {
        delete data.blacklist;
      }
      ev(
        _.extend(
          { 'app_state': 'main'},
          data
        )
      );
    });
  },

  // This is what is stored remotely. Note that
  // the offset isn't there.
  remoteKeys: [
    'length',     // Duration of the track
    'title',      // YT title
    'ytid'        // YT id after watch?v=(\w*)$
  ],

  saveTracks: function(){
    var result = db.find().select(Store.remoteKeys);
    ev(
     'tracklist', 
      result
    );
  },

  remove: function(id) {
    return remote('remove', id);
  }
};

ev.setter('id', function(){
  remote('createID', function(id) {
    ev({
      'id': id,
      'name': 'no name'
    });
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
  remote('recent', function(data) {
    data = _.without(data, false);
    each(data, function(which) {
      if(which.preview) {
        which.count = which.preview.count;
      } else {
        which.count = 0;
      }
    });
    ev('recent', data);
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

// ********************
//
// This is the loading 
// of the tracks into 
// the database.
//
// ********************
ev.test('tracklist', function(data, meta) {
  if(data) {
    if(_.isArray(data[0])) {
      db.insert(
        DB.objectify(
          Store.remoteKeys,
          data
        )
      );
    } else {
      db.insert( data );
    }
  }

  meta.done(true);
});

