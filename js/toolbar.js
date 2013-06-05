var Toolbar = {
  status: function(message) {
    $("#status .message")
      .html(message)
      .css({
        display: 'block',
        opacity: 1,
        top: "-30px"
      })
      .animate({top: "0px"}, 1000, function(){
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
      ev("name", this.value);
      input.replaceWith(dom);
      $("#edit-name").html("edit");
    });

    $("#remove-name").click(function(){
      remote({
        func: 'remove',
        id: ev('id'),
        onSuccess: function(data) {
          ev('app_state', 'splash');
        }
      });
    });

    $("#edit-name").click(function(){
      if(this.innerHTML == 'edit') {
        $("#remove-name").show();
        this.innerHTML = "save";
        dom.replaceWith(input);
        input.val(ev('name'));
        input.focus();
      } else {
        $("#remove-name").hide();
        ev("name", input.val());
        input.replaceWith(dom);
        this.innerHTML = "edit";
      }
    });
  }
};
