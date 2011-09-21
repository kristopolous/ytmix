ev.setter('playlist.id', function(){
  remote({
    func: 'createID',
    onSuccess: function(id) {
      ev.set('playlist.id', id);
    }
  });
});

ev.setter('recent', function(){
  remote({
    func: 'recent',
    onSuccess: function(data) {
      ev.set('recent', data);
    }   
  });
});

setInterval(function(){
  if(ev.isset('remote.data')) {

    remote(_.extend({ 
      func: 'update' ,
      id: ev('playlist.id')
    }, ev.get('remote.data')));

    ev.unset('remote.data');
  }
}, 4000);

(function(){
  var _requestID = 0,

  self.remote = function(opts) {
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

    $.getJSON('api/playlist.php', opts, function(ret) {
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

      ev.emit('remote', meta);
    });

    return reqID;
  }

  self.Store = {
    get: function(id) {
      return remote({
        func: 'get',
        id: id,
        onSuccess: function(data) {
          ev.set('app.state', 'main');
          ev.set('playlist.name', data.name);
          ev.set('playlist.id', data.id);
          ev.set('playlist.tracks', JSON.parse(data.tracklist));
        }
      });
    },

    remove: function(id) {
      return remote({ 
        func: 'remove',
        id: id
      });
    },

    // Update the table with new data given
    // an assumed index that had been previously
    // set
    update: function(data) { ev.set('remote.data', data); },
  };

  ev.when('playlist.name', function(name, meta) {
    Remote.update({ name: name, id: ev('playlist.id') });
  });

  ev.when('playlist.tracks', function(data) {
    Remote.update(data);
  });
})();
