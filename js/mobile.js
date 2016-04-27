var Mobile = {
  init: function(){
    CLOCK_FREQ *= 4;

    $("#search-mobile").click(function(){
      var res = ev.toggle('btn:search');
      if(res) {
        $("#search").show();
        setTimeout(function(){
          $("#normal-search").focus();
        },1);
      } else {
        Search.clear();
        $("#search").hide();
      }
    });
   
  }
};
