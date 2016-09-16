function when(condition) {
  var _cb, _ival = setInterval(function(){

    if(condition()) {
      _cb();
      clearInterval(_ival);
    }
  }, 20);

  return {
    run: function(cb) { _cb = cb; }
  }
}

function range(what, range) {
  return Math.min(range[1], 
    Math.max(range[0], what)
  );
}

var Utils = {
  insertAfter: function(entry, list, db) {
    db = db || _db;

    // the size of things we are putting in.
    var len = list.length, start_id = entry.id;

    // move the things forward.
    db.find(
      { id: db('> ' + entry.id) }
    ).update(
      function(entry) {
        log(entry.id, '>>', len + entry.id)
        entry.id += len;
      }
    );

    log('starting at', start_id);

    return db.insert(list).update(function(entry) {
      entry.id = start_id++;
      log('+', entry.id);
    });    

  },

  stack: function(start, stop) {
    if (arguments.length == 0) {
      start = 3;
      stop = 80;
    }
    try { throw new Error(); }
    catch (e) { return(
      e.stack
        .split('\n')
        .slice(start,stop)
        .join('\n')
        .replace(/^[^@]*/mg, '')
        .replace(/\n[^@]*/mg, '\n   ')
      || e.stack);
    }
  },

  // This is an aggregate function that can probably
  // be refactored into a reduction
  runtime: function(obj) {
    var total = 0;

    if(obj.length == 0) { return 0; }

    _.each(Object.keys(obj), function(key) {
      var which = obj[key];
      if(which && which.length) {
        total += parseInt(which.length);
      }
    });
    return total;
  },

  secondsToTime: function(count) {
    var stack = [];

    // seconds
    count = Math.floor(count / 60);

    // minutes
    if (count > 1) {
      stack.push((count % 60) + " min");
      count = Math.floor(count / 60);
    }

    // hours
    if (count > 1) {
      stack.push((count % 24) + " hours");
      count = Math.floor(count / 24);
    }

    // days
    if (count > 1) {
      stack.push(count.toFixed(0) + " days");
    }
    return stack.reverse().join(' ').replace(/^0/,'');
  },

  onEnter: function(div, callback) {
    $(div).keyup(function(e){
      var kc = window.event? window.event.keyCode : e.which;

      if (kc == 13) {
        callback.apply(this);
      }

      return true;
    });
  },

  clean: function(str) {
    str = str.replace(/^\s+/, '');
    return str.replace(/\s+$/, '');
  },

  scrollbarWidth: function() {
    var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div>');
    // Append our div, do our calculation and then remove it
    $('body').append(div);
    var w1 = $('div', div).innerWidth();
    div.css('overflow-y', 'scroll');
    var w2 = $('div', div).innerWidth();
    $(div).remove();
    return (w1 - w2);
  },

  tuple: function (what, fn0, fn1) {
    var res = [];
    if(!fn0) {
      fn0 = function(m) { return m };
    }

    _.each(what, function(value, key) {
      res.push([fn0(key), fn1(value)]);
    });

    return res;
  }
    
};

function Queue() { }
Queue.prototype = new Array();
_.each(['Push', 'Pop', 'Shift', 'Unshift'], function(which) {
  var 
    protoName = which.toLowerCase(),
    stackName = protoName + 'Stack';

  Queue.prototype['on' + which] = function(callback) {
    (this[stackName] || (this[stackName] = [])).push(callback);
  }
  Queue.prototype[protoName] = function() {
    if(this[stackName]) {
      for(var i = 0; i < this[stackName].length; i++) {
        this[stackName][i].apply(this, arguments);
      }
    }
    return Array.prototype[protoName].apply(this, arguments);
  }
});

Queue.prototype.doshift = function(){
  if(this.length) {
    (this.shift())();
    if(this.length == 0) {
      // This means that we have satisfied all
      // the requests to get remote data. We 
      // should probably update the playlist
      // if it needs to be updated.
      //
      // This finds all the authorative references
      // to the playlist track list in the database
      //
      // And then sets those objects as the playlist_tracks
      // which will fire off a remote request to do 
      // an update
      ev('tracklist',
        _db
          .hasKey('id')
          .order('id', 'asc')
      );
    }
  }
};

function log() {
  console.log.apply(console,
    [
      (new Date() - START),
      Utils.stack(0,2).split('/').pop()
    ].concat( slice.call(arguments) )
  );
}

function stats(count) {
  if(!count) {
    count = 20;
  }
  _db.update({
    artist: function(m) { 
      return m.title.split(' - ')[0];
    }
  })

  var 
    artist = _db.group('artist'),
    tuple = Utils.tuple(artist, false, function(m) { return m.length });

  console.table(
    tuple.sort(function(a, b) {
      return b[1] - a[1];
    }).slice(0, count)
  );
}

function debug(list) {
  if(list.join) {
    document.getElementById('debug').innerHTML = list.join(' ');
  }
}

var Priority = (function(){

  function sort(pri) {
    if(pri.dirty) {
      var sorted = pri.sort(function(a, b) {
        return 1000000 * (b.priority - a.priority) + 0.0001 * (a.id - b.id);
      });

      pri.dirty = false;
      pri.splice.apply([], [0, 0].concat(sorted));
    }
  }

  function element(what) {
    return !what || what.arg;
  }

  function Priority() {
    Object.defineProperty(this, 'id', {
      enumerable: false, 
      writable: true,
      value: 0
    });

    Object.defineProperty(this, 'dirty', {
      enumerable: false, 
      writable: true,
      value: false
    });
  }

  Priority.prototype = Object.create(Array.prototype);
  Priority.constructor = Priority;

  Priority.prototype.push = function(arg, priority) {
    Array.prototype.push.call(this, {arg: arg, id: this.id++, priority: priority || 0});
    this.dirty = true;
  }

  Priority.prototype.unshift = function(arg, priority) {
    Array.prototype.unshift.call(this, {arg: arg, id: -(this.id++), priority: priority || 0});
    this.dirty = true;
  }

  Priority.prototype.shift = function() {
    sort(this);
    return element(Array.prototype.shift.call(this));
  }

  Priority.prototype.pop = function() {
    sort(this);
    return element(Array.prototype.pop.call(this));
  }

  return Priority;
})();


