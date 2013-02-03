
var Utils = {
  stack: function(ex) {
    try { throw new Error(); }
    catch (e) { return(
      e.stack
        .split('\n')
        .slice(4,22)
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

    each(obj, function(which) {
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
  }
};

function Queue() { }
Queue.prototype = new Array();
each(['Push', 'Pop', 'Shift', 'Unshift'], function(which) {
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
        db
          .hasKey('playlistid')
          .order('playlistid', 'asc')
      );
    }
  }
};
