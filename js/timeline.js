var Timeline = (function(){
  var 
    data = {},
    maxPlayer = 3,

    // The centroid, or currently playing track is floor(maxPlayer / 2)
    centroid = Math.floor(maxPlayer / 2),

    // idsActive is the list of is, corresponding to the vidContiainers
    // that should be currently loaded.  Trivially, idsActive[centroid]
    // should usually be playing
    idsActive = [],

    player = {},

    ix,
    uniq = 0;

  $(function(){
    // we instantiate [maxPlayers] swfobjects which will hold the ytids of the
    // videos we which to play.
    for(var ix = 0; ix < maxPlayer; ix++) {
      $("<div id=vidContainer-" + ix + ">").appendTo("#timeline");

      swfobject.embedSWF("http://www.youtube.com/apiplayer?" +
        "version=3&enablejsapi=1&playerapiid=player-" + ix,
        "vidContainer-" + ix, "188", "152", "9", null, null, 
        {allowScriptAccess: "always"}, {id: 'ytPlayer-' + ix});
    }
  });

  var updateRunning = false;
  function updateytplayer() {
    updateRunning = true;

/*
    // mechanics for moving the centroid
    if(player[play.active].getCurrentTime() > 0) {
      if(player[play.active].getDuration() - player[play.active].getCurrentTime() < 10) {
        if(play.nextFlag == true) {
          go_next();
          play.nextFlag = false;
        }
      }
    }
*/
  }

  self.onYouTubePlayerReady = function(playerId) {
    var id = parseInt(playerId.substr(-1));
    console.log(id, playerId);
    player[id] = document.getElementById(playerId);

    if(!updateRunning) {
      setInterval(updateytplayer, 250);
    }

    player[id].playVideo();
  }

  return {
    data: data,

    // Swap out a flash controller for an image of the youtube video.
    // This is done wo we don't have a lot of flash controllers at once
    makeImage: function(){}, 

    remove: function(index){
      // find the yt id at the index to
      // be removed
      var 
        ytid = data[index].ytid,

        // and the corresponding object
        // in our database
        obj = db.findFirst({
          ytid: ytid
        });

      // increment the announcement that 
      // this was removed at some point and
      // may not be liked
      obj.removed++;

      // remove it from the dom
      data[index].dom.remove();

      // find the related videos with respect
      // to the ytid to be removed
      db.find().update(function(data) {

        // remove this from the reference list.
        data.reference = _.without(data.reference, index);

        // this makes our lives eaiser
        data.count = data.reference.length;
      });

      db.find('count', 0).remove();

      data[index].active = false;
    },

    add: function(ytid) {
      var myid = uniq;

      data[myid] = {
        index: myid,
        flash: true,
        remover: $("<a class=removal>remove</a>").css('opacity',0.6),
        ytid: ytid,
        active: true,
        title: $("<a target=_blank href=http://www.youtube.com/watch?v=" + ytid + "/>")
      };

      data[myid].dom = $("<div />")
        .addClass('track')
        .append(data[myid].remover)
    	  .append("<img src=http://i.ytimg.com/vi/" + ytid + "/hqdefault.jpg?w=188&h=141>")
        .append(data[myid].title)

      console.log(player);
      eval(_inject('add'));
      player[0].loadVideoById(ytid);

      data[myid].remover.click(function(){
        Timeline.remove(myid);
        gen();
      });

      data[myid].dom.appendTo('#timeline');

      if(db.findFirst({ytid: ytid}).related) {
        Timeline.update(myid);
      }

      uniq ++;

      return myid;
    },

    update: function(id){
      var obj = db.findFirst({ytid: data[id].ytid});

      data[id].title.html(obj.title);

      db.find({
        ytid: db.isin(obj.related)
      }).update(function(data) {
        if(!data.reference) {
          data.reference = [];
        }
        data.reference.push(id);

        data.count = data.reference.length;
      });
    }
  };
})();

