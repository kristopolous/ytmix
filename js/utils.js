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

self._scrollwidth = 0;
$(function(){
  self._scrollwidth = Utils.scrollbarWidth();
})();
