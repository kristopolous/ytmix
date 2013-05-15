var Results = {
  viewable: {},

  SortCompare: {pre: {}, post: {}},

  init: function(){
    var timeout;

    Results.template = _.template( $("#T-Result").html() );

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

    /*
    $("#video-viewport").sortable({
      stop: function(event, ui) {
        var elementList = document.getElementById("video-viewport").children;
        for(var index = 0; index < elementList.length; index++) {
          Results.SortCompare.post[elementList[index].ytid] = index;
        }

        db.find({
          ytid: db.isin(_.keys(Results.SortCompare.post))
        }).update(function(which) {
          which.playlistid += Results.SortCompare.post[which.ytid] - Results.SortCompare.pre[which.ytid];
        });

        var playlistOrder = db.sort(function(a, b) { return a.playlistid - b.playlistid });

        Timeline.build(playlistOrder);
      }
    });
    */
    
    ev({
      search_results: Results.gen,
      request_gen: Results.gen,
      search_query: Results.gen
    });
  
    // We need to scroll the video selector to put this
    // in the right place.
    $("#scroll-to").click(Results.scrollTo);
  },

  scrollTo: function(){
    var
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      count = db.find().length,
      perline = Math.floor(width / _video.width);

    ev.isset("active_data", function(){
      document.getElementById("video-list").scrollTop = 
        (Timeline.player.activeData.id / perline) * _video.height - 
        2 * _video.height;
    });

    Results.gen();
  },

  resize: function(){
    var height = window.innerHeight || document.body.offsetHeight;

    $("#video-list").css('height', (height - $("#bottom-box").offset().top) + 'px');
    ev.set('request_gen');
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

//      if(!dbReference[0].jqueryObject.hasClass("active")) {
        dbReference[0].jqueryObject.timeline.css('display','none');
 //     }

      $("#video-viewport").append(dbReference[0].jqueryObject);
      dom = dbReference[0].jqueryObject;
    } else {

      var 
        star = $("<a>&#9733;</a>").addClass("star").click(function(){
          UserHistory.star(obj.ytid);
          $(this).toggleClass('active');
        }),
        remove = $("<a>X</a>").addClass("del").click(function(){
          Timeline.remove(obj.id);
        }),
        timeline = $("<div class=timeline-container />").addClass('hover').append(
          $("<div class=timeline-outer />").css('opacity', 0.5).append( 
            $("<div class=timeline-inner />")
          )
        );

      // inlining html has fallen out of fashion for templates I know...
      var 
        splitup = obj.title.split(' - '),
        title = splitup.pop(),
        artist = splitup.join(' - '),
        result = $("<span class=result/>")
        .hover(
          function(){ 
            timeline.css('display','block') 
          }, 
          function(){ 
            if (timeline.hasClass('active')) {
              return;
            }
            timeline.css('display','none') 
          }
        )
        .append(Results.template({
          ytid: obj.ytid,
          title: title,
          artist: artist
        }))
        .append(timeline)
        .append(remove)
        .append(star)
        .appendTo($("#video-viewport"));

        timeline
          .hover(function(){
            Scrubber.phantom.dom.detach().appendTo(timeline);
            Scrubber.phantom.id = obj.ytid;
            Scrubber.phantom.container = timeline;
          }, function(){
            Scrubber.phantom.dom.detach().appendTo("#offscreen");
            Scrubber.phantom.container = false;
          })
          .mousemove(function(e) {
            var point = (e.clientX - 8) - result.offset().left;
            point = Math.max(5, point);
            point = Math.min(255, point);
            Scrubber.phantom.offset = ((point - 5) / 255);
            Scrubber.phantom.dom.css("left", point + "px");
          });

      // back reference of what we are generating
      result.get(0).ytid = obj.ytid;
      result.timeline = timeline;
      result.star = star;

      db.find({ytid: obj.ytid}).update({jqueryObject: result});

      dom = result;
      if (!UserHistory.isViewed(obj.ytid)) {
        dom.addClass('new');
      }
    }
    if (UserHistory.isStarred(obj.ytid)) {
      dom.star.addClass('active');
    } else {
      dom.star.removeClass('active');
    }

    // This is important. There's a mapper in
    // the generator that relies on the output
    // being the same as the in
    obj.jqueryObject = dom;
    return obj;
  },

  gen: function(opts){
    var 
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      top = $("#video-list").scrollTop(),
      bottom = height + top,
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

    opts = opts || {};

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
      set = db.find(constraints).sort(function(a, b) { 
        return a.playlistid - b.playlistid;
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
        opts.force || 
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

      _.each(_.values(Results.viewable), function(which) {
        which.jquery.detach();
      });

      // Make a viewable reference available so
      // that other functions can hook inside here
      // if they want to know if something is active
      // or not
      Results.viewable = {};

      var output = [];
      // We take the results from all the things that we
      // display on the screen (it returns a jquery element
      // with a back reference to the ytid).
      db.transaction.start(); {
        each(map(set.slice(start,stop), Results.draw), function(which) {

          // And then we create our map based on ytid
          // of the jquery and the dom reference. This
          // is used in the updateytplayer function of
          // timeline.js in order to generate and update
          // the result based scrubber.
          Results.viewable[which.ytid] = {
            jquery: which.jqueryObject,
            dom: which.jqueryObject.get(0)
          };

        });
      } db.transaction.end();

      // This is for sorting. We construct the list after the gen of the
      // elements in order to get an authortative one.
      var elementList = document.getElementById("video-viewport").children;
      for(var index = 0; index < elementList.length; index++) {
        Results.SortCompare.pre[elementList[index].ytid] = index;
      }
    }

    // This is used to make sure that our regeneration efforts
    // don't confuse the browser an cause a scrolling problem.
    // 
    // Based on when things generate in the DOM, a race condition
    // can occur that will make the results slowly scroll by in
    // Chrome.
    //$("#video-list").get(0).scrollTop = top;

    Timeline.updateOffset();
  }
};

