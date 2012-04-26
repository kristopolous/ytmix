var Results = {
  viewable: {},

  init: function(){
    var timeout;

    // The scrollbar is consumed improperly and
    // so it must be accounted for in the width 
    // calculations.
    self._scrollwidth = Utils.scrollbarWidth();

    setTimeout(Results.resize, 1000);
    $(window).resize(Results.resize);

    // The gencheck function just makes sure
    // that we don't call the generator too
    // frequently, less the system gets hosed
    // because it's perpetually trying to redraw
    // everything when it doesn't need to.
    function gencheck(){ 
      if(timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(Results.gen, 75);
      return true;
    }

    $("#video-list")
      .scroll(gencheck)
      .keydown(gencheck);

    var compare = {pre: {}, post: {}};

    /*
    $("#video-viewport").sortable({
      start: function(event, ui) {
        $("#video-viewport > *").each(function(index, dom) {
          compare.pre[dom.ytid] = index;
        });
      },
      stop: function(event, ui) {
        $("#video-viewport > *").each(function(index, dom) {
          compare.post[dom.ytid] = index;
        });

        db.find({
          ytid: db.isin(_.keys(compare.post))
        }).update(function(which) {
          if('playlistid' in which) {
            which.playlistid += compare.post[which.ytid] - compare.pre[which.ytid];
          }
        });

        var playlistOrder = db.hasKey('playlistid').sort('playlistid', 'asc');

        Timeline.build(playlistOrder);
      }
    });
    */

    ev.on('request_gen', Results.gen);
  
  },

  resize: function(){
    var height = window.innerHeight || document.body.offsetHeight;

    $("#video-list").css('height', (height - $("#bottom-box").offset().top) + 'px');
  },

  draw: function(obj) {

    // Look to see if we have generated this before.
    var 
      dom,
      dbReference = db.find({ytid: obj.ytid});

    if(dbReference.length && dbReference[0].jqueryObject) {
      // If so, then just take the old dom entry and
      // append it to the video viewport, returning
      // the object that was previously created.

      dbReference[0].jqueryObject.timeline.css('display','none');

      $("#video-viewport").append(dbReference[0].jqueryObject);
      dom = dbReference[0].dom;
    } else {

      var 
        star = $("<a>&#9733;</a>").addClass("star").click(function(){
          UserHistory.star(obj.ytid);
          $(this).toggleClass('active');
        }),
        timeline = $("<div class=timeline-container />").addClass('hover').append(
          $("<div class=timeline-outer />").css('opacity', 0.5).append( 
            $("<div class=timeline-inner />")
          )
        );

      var result = $("<span class=result/>")
        .hover(
          function(){ 
            Scrubber.phantom.detach().appendTo(timeline);
            Scrubber.id = obj.ytid;
            Scrubber.container = timeline;
            timeline.css('display','block') 
          }, 
          function(){ timeline.css('display','none') }
        )
        .mousemove(function(e) {
          var point = (e.clientX - 8) - result.offset().left;
          point = Math.max(5, point);
          point = Math.min(255, point);
          Scrubber.offset = ((point - 5) / 255);
          Scrubber.phantom.css("left", point + "px");
        })
        .append("<img src=http://i4.ytimg.com/vi/" + obj.ytid + "/default.jpg><span><p><em>" + obj.title + "</em>" + Utils.secondsToTime(obj.length) + "</p></span>")
        .append(timeline)
        .append(star)
        .appendTo($("#video-viewport"));

      // back reference of what we are generating
      result.get(0).ytid = obj.ytid;
      result.timeline = timeline;

      db.find({ytid: obj.ytid}).update({jqueryOjbect: result});

      dom = result;
    }

    if (UserHistory.isStarred(obj.ytid)) {
      star.addClass('active');
    }
    if (!UserHistory.isViewed(obj.ytid)) {
      $(dom).addClass('new');
    }

    return dom;
  },

  gen: function(){
    var 
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      top = $("#video-list").scrollTop(),
      bottom = $("#video-list").height() + top,
      set,
      total,
      constraints = {removed: 0},
      query = ev('search_query'),
      perline = Math.floor(width / _video.width),
      start = Math.floor(top / _video.height) * perline,
      stop = Math.ceil(bottom / _video.height) * perline,
      topmodoffset = top % _video.height;

    if(query.length) {
      constraints.title = db.like(query);
    }

    var 
      tracks = Timeline.db.find().length,
      bBoost, aBoost;

    // There's a function that permits one to just display the related results
    // This not only show the isolated related results, but then modifies the
    // drop down menu near the related results to say as much.  This second
    // part should probably be removed and abstracted to somewhere else.
    if(ev('search_related').length) {
      var 
        allrelated = db.find('ytid', db.isin(ev('search_related'))).select('related'),
        unique = _.uniq(_.flatten(allrelated));

      set = db.find(constraints, {ytid: db.isin(unique)});
    } else {
      // To make sure that our playlist gets to the front of the line,
      // I create booster functions for sorting.  I should probably
      // permit multi-tiered sorting based on various parameters in my
      // sorting function, but I don't think I do that ... there's probably
      // some tricky ordinal stuff I'd have to pull.
      set = db.find(constraints).sort(function(a,b){ 
        bBoost = isNaN(b.playlistid) ? 0 : (tracks - b.playlistId) * 1000;
        aBoost = isNaN(a.playlistid) ? 0 : (tracks - a.playlistId) * 1000;
        return (bBoost + b.reference.length) - (aBoost + a.reference.length);
      });

      set = ev('search_results').concat(set);
    }

    // We find out some statistics about what we should be
    // generating the viewport to know whether we need
    // to clear everything and try again.
    total = set.length;

    start = Math.max(start, 0);
    stop = Math.min(stop, total);

    // These are the two buffers of non-generation that are kept
    // at the top and the bottom of the query results. These
    // help preserve the scroll bar order.
    $("#bottom-buffer").css('height', (total - stop) / perline * _video.height + "px");
    $("#top-buffer").css('height', top - topmodoffset + "px");

    // These are sanity checks to see if we need to regenerate
    // the viewport based on say, a user scrolling something,
    // new results coming in, old results being deleted, etc.
    //
    // It's worth noting that we key the range not based on
    // ordinals but on the ytid at the ordinals.  This is to
    // try to thwart results changing with a bunch of other
    // things not.
    if(
        _video.old.start != start || 
        _video.old.stop != stop  || 
        _video.old.query != query  || 
        _video.old.length != total ||
        _video.old.current != ev('active_track').ytid
      ) {

      _video.old = { 
        start : start, 
        stop : stop, 
        query : query, 
        length : set.length, 
        current: ev('active_track').ytid 
      };

      $("#result-now").remove().appendTo($("#players"));
      $("#video-viewport").children().filter(function(index, which) {
        return this.className == 'result';
      }).detach();

      // Make a viewable reference available so
      // that other functions can hook inside here
      // if they want to know if something is active
      // or not
      Results.viewable = {};

      // We take the results from all the things that we
      // display on the screen (it returns a jquery element
      // with a back reference to the ytid).
      each(map(set.slice(start,stop), Results.draw), function(which) {

        // And then we create our map based on ytid
        // of the jquery and the dom reference. This
        // is used in the updateytplayer function of
        // timeline.js in order to generate and update
        // the result based scrubber.
        Results.viewable[which.ytid] = {
          jquery: which,
          dom: which.get(0)
        };

      });
    }

    // This is used to make sure that our regeneration efforts
    // don't confuse the browser an cause a scrolling problem.
    // 
    // Based on when things generate in the DOM, a race condition
    // can occur that will make the results slowly scroll by in
    // Chrome.
    $("#video-list").get(0).scrollTop = top;
  }
};

