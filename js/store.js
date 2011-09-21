var Remote = (function(){
  var _requestID = 0;

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

  setInterval(function(){
    if(ev.isset('remote.data')) {

      remote(_.extend({ 
        func: 'update' ,
        id: ev('playlist.id')
      }, ev.get('remote.data')));

      ev.unset('remote.data');
    }
  }, 4000);

return {
    create: function(callback){
      return remote({
        func: 'createID',
        onSuccess: function(id) {
          ev.set('playlist.id', id);
          if(callback) {
            callback(id);
          }
        }
      });
    },

    getId: function(id, callback) {
      return remote({
        func: 'get',
        id: id,
        onSuccess: function(data) {
          ev.set('app.state', 'main');
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

    update: function(data) {
      ev.set('remote.data', data);
    },

    setName: function(name) {
      return Remote.update({
        name: name,
        id: ev('playlist.id')
      });
    }
  };
})();

ev.when('playlist.name', function(name) {
  Local.set('name', name);
  Remote.setName(name);
});

(function(){
  var 
    history,
    Index;

  if($.jStorage.get('history') == null) {
    $.jStorage.set('history', []);
  }
  history = $.jStorage.get('history');
      
  ev.when('playlist.id', function(id) {
    if(Index && !history[Index].id) {
      Local.set('id', id);
    }
  });

  self.Local = {
    create: function(){
      Index = history.length;
      history.push({
        name: 'Untitled',
        data: []
      });
      Remote.create();
    },

    prune: function(_index) {
      history[_index].data = _.without(history[_index].data, null);
      $.jStorage.set('history', history);
    },

    get: function(_index) {
      Index = _index;
      Local.prune(_index);

      if(history[_index].id) {
        ev.set('playlist.id', history[_index].id);
        ev.set('playlist.name', history[_index].name);
        ev.set('playlist.tracks', history[_index].data);
      } else {
        Remote.create();
      }
    },

    set: function(key, value) {
      if(!Index) {
        Index = history.length;
        history.push({
          name: 'Untitled',
          data: []
        });
      }
      history[Index][key] = value;
      return $.jStorage.set('history', history);
    },

    // Update the table with new data given
    // an assumed index that had been previously
    // set
    update: function(data) {
      Remote.update({tracklist: JSON.stringify(data)});
      return Local.set('data', data);
    },

    // Remove an entire playlist from memory
    remove: function(_index) {
      if( history[_index].id ) {
        Remote.remove(history[_index].id);
      }
      history.splice(_index, 1); 
      $.jStorage.set('history', history);
    },

    add: function(tuple) {
      history[Index].data.push(tuple);
      $.jStorage.set('history', history);
    },

    recent: function() {
      return history.slice(-8);
    }
  };
})();
