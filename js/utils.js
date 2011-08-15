var Utils = {
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
