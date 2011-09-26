var Utils = {
  secondsToTime: function(count) {
    var stack = [];
    for(
      count = Math.floor(count);
      count > 0;
      count = Math.floor(count / 60)
    ) {
      stack.push(((count % 60) + 100).toString().substr(1)); 
    }
    return stack.reverse().join(':').replace(/^0/,'');
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
  }

};
