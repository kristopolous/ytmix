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
          ev.set('playlist.id', data.id);
          if(callback) {
            callback(data);
          }
        }
      });
    },

    update: function(data) {
      return remote(_.extend(
        { func: 'update' },
        data
      ));
    },

    setName: function(name) {
      return Remote.update({
        name: name
      });
    }
  };
})();

ev.when('playlist.name', function(name) {
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
      
  self.Local = {
    create: function(){
      Index = history.length;
      history.push([]);
    },

    prune: function(_index) {
      history[_index] = _.without(history[_index], null);
      $.jStorage.set('history', history);
    },

    get: function(_index) {
      Index = _index;
      Local.prune(_index);
      return history[_index];
    },

    // Update the table with new data given
    // an assumed index that had been previously
    // set
    update: function(data) {
      console.log(Index, data);
      history[Index] = data;
      $.jStorage.set('history', history);
    },

    // Remove an entire playlist from memory
    remove: function(_index) {
      history.splice(_index, 1); 
      $.jStorage.set('history', history);
    },

    add: function(tuple) {
      history[Index].push(tuple);
      $.jStorage.set('history', history);
    },

    recent: function() {
      return history.slice(-8);
    }
  };
})();
