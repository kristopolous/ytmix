var Toolbar = {
  status: function(message) {
    $("#status .message")
      .html(message)
      .css({
        display: 'block',
        opacity: 1,
        top: "-30px"
      })
      .animate({top: "10px"}, 1000, function(){
        setTimeout(function(){
          $("#status .message").fadeOut(1000);
        }, 1500);
      });
  },

  init: function(){
    var 
      dom = $("#playlist-name"), 
      input = $("<input>");

    Utils.onEnter(input, function() {
      ev("playlist_name", this.value);
      input.replaceWith(dom);
      $("#edit-name").html("edit");
    });

    $("#edit-name").click(function(){
      if(this.innerHTML == 'edit') {
        this.innerHTML = "save";
        dom.replaceWith(input);
        input.val(ev('playlist_name'));
        input.focus();
      } else {
        ev("playlist_name", input.val());
        input.replaceWith(dom);
        this.innerHTML = "edit";
      }
    });
  }
};
