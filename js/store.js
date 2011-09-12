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
          alert(data.toSource());
          ev.set('playlist.id', data.id);
          if(callback) {
            callback(data);
          }
        }
      });
    },

    update: function(data) {
      if(id === undefined) {
        throw new TypeError();
      } 

      return remote(_.extend(
        { func: 'update' },
        data
      ));
    },

    setName: function(name) {
      return update({
        name: name
      });
    }
  };
})();

var Local = (function(){
  var 
    playlist = [],
    history,
    index;

  if($.jStorage.get('history') == null) {
    $.jStorage.set('history', []);
  }
  history = $.jStorage.get('history');
      
  return {
    create: function(){
      index = history.length;
      history.push([]);
      return index;
    },

    get: function(_index) {
      index = _index;

      return _.map(history[_index], function(which) {
        return which[0];
      });
    },

    remove: function(index) {
      history.splice(index, 1); 
      $.jStorage.set('history', history);
    },

    add: function(offset, tuple) {
      history[index][offset] = tuple;
      $.jStorage.set('history', history);
    },

    recent: function() {
      return _.map(history.slice(-7), function(which) {
        return which[0];
      });
    }
  };
})();
