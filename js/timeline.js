var Timeline = (function(){
  var 
    data = {},
    uniq = 0;

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
        .append("<embed type=application/x-shockwave-flash wmode=transparent allowscriptaccess=always width=188 height=152 src=http://www.youtube.com/v/" + ytid + "&hl=en&fs=1&autoplay=1></embed>")
        .append(data[myid].title)

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

