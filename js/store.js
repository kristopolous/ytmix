function remote(opts) {
  // We make sure that we don't hammer the server unnecessarily.
  // If more than one request is happening at a time, we build a
  // queue of the requests.
  if(remote.lock) {
    if(opts.func === 'update') {
      remote.queue = remote.queue.filter(row => !row[0] || row[0].func !== 'update');
    }
    log("deferring. Queue size:", remote.queue.length);
    remote.queue.push(arguments);
    return;
  }

  remote.lock = true;
  
  var 
    ret,
    reqID = remote.id ++,
    url = 'api/entry.php?',
    exposedParams = [],
    onSuccess = [],
    onFailure = [];

  // This is the array way of calling things.
  if(_.isString(opts)) {
    var list = slice.call(arguments);
    opts = {};

    if(_.isFunction(_.last(list))) {
      // the success function is the last thing ... it
      // can also be omitted entirely.
      onSuccess.push(list.pop());
    } 
    ["func", "id", "param"].forEach(function(which) {
      if(list) {
        opts[which] = list.shift();
      }
    });
    if(list) {
      opts['extra'] = list;
    }
  } 

  ["func", "id"].forEach(function(which) {
    if(opts[which]) {
      exposedParams.push([which, opts[which]].join('='));
      delete opts[which];
    }
  });

  url = url + exposedParams.join('&');
  $.ajax({
    url: url,
    data: opts,
    type: "POST",
    timeout: 7500,
    dataType: "text",
    success: function(ret) {

      try {
        ret = JSON.parse(ret);
      } catch(ex) {
        console.log("Couldn't parse json", ret);
        ret = {status: false};
      }

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

      if('result' in ret) {
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
      }

      if(ret.status === true && onSuccess.length > 0) {
        _.each(onSuccess, function(cb) {
          try {
            cb(ret.result);
          } catch (ex) { }
        });
      } 

      if(ret.status === false){
        console.log(">> call failed", opts, meta, url);

        if(onFailure.length > 0) { 
          _.each(onFailure, function(cb) {
            cb(ret.result);
          });
        }
      }

      ev('remote', meta);
    }
  }).always(function() {
    setTimeout(function(){
      remote.lock = false;
      if(remote.queue.length) {
        log("Queue pop!", remote.queue.length);
        // console.log(remote.apply, remote.queue);
        remote.apply(0, remote.queue.shift());
      }
    }, remote.delay);
  });

  ret = {
    reqID: reqID,
    then: function(cb) { onSuccess.push(cb); return ret;},
    onFailure: function(cb) { onFailure.push(cb); return ret;}
  };
  return ret;
}
remote.queue = new Priority();
remote.delay = 900;
remote.id = 0;
remote.prioritize = function() {
  // We make sure that we don't hammer the server unnecessarily.
  // If more than one request is happening at a time, we build a
  // queue of the requests.
  if(remote.lock) {
    log("deferring(priority). Queue size:", remote.queue.length);
    remote.queue.push(arguments);//, 10);
    return;
  }

  return remote.apply(this, arguments); 
}

var Store = {
  //
  // *****************************
  //  THIS IS THE PLAYLIST LOADER 
  // *****************************
  //
  get: function(id) {
    return remote('get', id, function(data) {
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
    'ytid',       // YT id after watch?v=(\w*)$
    'method'      // The method that the video came in through
  ],

  saveTracks: function(){
    var result = _db.order('id').select(Store.remoteKeys);
    ev(
     'tracklist', 
      result
    );
  },

  // Add a method for how the content comes in (via a search or related)
  // and then hit the callback with that.
  addMethod: function(method, cb) {
    if(! (method in ev('method')) ) {
      remote('addMethod', ev('id'), method, cb);
    } else {
      cb(ev('method')[method]);
    }
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
    _.each(data, function(which) {
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

    remote(_.extend({ 
      func: 'update' ,
      id: ev('id')
    }, ev('remote_data')));

    ev.unset('remote_data');
  }
}, remote.delay);

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
      _db.insert(
        DB.objectify(
          Store.remoteKeys,
          data
        )
      );
    } else {
      _db.insert( data );
    }
  }

  meta.done(true);
});

