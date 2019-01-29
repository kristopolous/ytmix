var Results = {
  viewable: {},

  lock: 0,
  cache: {a:{}, t:{}},
  lastGen: new Date(),
  SortCompare: {pre: {}, post: {}},

  init: function(){
    var timeout;

    Results.template = isMobile ? 
      Template.resultMobile :
      Template.resultDesktop;

    // The scrollbar is consumed improperly and
    // so it must be accounted for in the width 
    // calculations.
    self._scrollwidth = Utils.scrollbarWidth();

    if(isMobile) {
      _video.width = $(document).width();
      if(_video.width > 512) {
        _video.width /= 2;
      }
    } else {
      _video.width = 260;
    }

    $(window).resize(Results.resize);
    window.addEventListener("orientationchange", Results.resize);

    // The gencheck function just makes sure
    // that we don't call the generator too
    // frequently, less the system gets hosed
    // because it's perpetually trying to redraw
    // everything when it doesn't need to.
    function gencheck(){ 
      if(new Date() - Results.lastGen < 500) {
        return;
      }
      if(timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(Results.gen, 50);
      return true;
    }

    $("#video-list")
      .scroll(gencheck)
      .keydown(gencheck);

    ev({
      request_gen: Results.gen,
      search_query: function(){
        // make sure we scroll to the top
        $("#video-list").scrollTop(0);
        Results.gen();
      }
    });
  
    // We need to scroll the video selector to put this
    // in the right place.
    $("#scroll-to").click(Results.scrollTo);

    $("#related").click(Search.related);
  },

  mobile: {
    timeline: function(e, result) {
      var 
        ytid = $(this).data('id'),
        entry = _db.findFirst({ ytid: ytid }),
        offset,
        point = (e.clientX - 8) - result.offset().left;

      point = range(point, [0, _video.width]);

      offset = point / _video.width;

      Timeline.play(ytid, entry.length * offset);
    }
  },

  scrollTo: function(){
    var
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      count = _db.find().length,
      perline = Math.floor(width / _video.width);

    ev.isset("active_data", function(){
      document.getElementById("video-list").scrollTop = 
        (Timeline.player.activeData.id / perline) * _video.height - 
        2 * _video.height;
    });

    Results.gen();
  },

  resize: function(){
    $("#video-list").css('height', ($(window).height() - $("#bottom-box").offset().top) + 'px');
    ev.set('request_gen');
  },

  split: function(title) {
    var splitup = title.split(/\s[-—]+\s/), artist, title, _a, _t, swap;
    //console.log(title, splitup);

    if(splitup.length == 1) {
      splitup = splitup[0].split(/[-—]+ /);
    }
    if(splitup.length == 1) {
      splitup = splitup[0].split(/ [-—]+/);
    }
    if(splitup.length == 1) {
      splitup = splitup[0].split(/ [@:\*]* /);
    }
    if(splitup.length == 1) {
      splitup = splitup[0].split(/[-—]/);
      // if the first group is small then we can
      // presume that this might have been a hyphen
      // and abort
      if(splitup[0].length < 8) {
        splitup.join('-');
      }
    }
    if(splitup.length == 1) {
      splitup = splitup[0].split(/ by /i);

      // The logic of [artist, title] has been reverse on us 
      // Those wily tricksters!
      if(splitup.length > 1) {
        var tmp = splitup[1];
        splitup[1] = splitup[0];
        splitup[0] = tmp;
      }
    }
    // supports things like Artist "Track"
    if(splitup.length == 1) {
      var form = splitup[0].match(/(.+)"(.+)"/);

      if(!form) {
        form = splitup[0].match(/(.+)\((.+)\)/);
      }

      if (form) {
        splitup = form.slice(1,3);
      }
    }
      

    // There was a problem with a stray space going
    // into the search query when clicking on the artist name.
    artist = splitup.shift().replace(/\s*$/, '');
    title = splitup.join(' - ');

    // So two things ... first we want to have a cache to see if
    // we *may be better* swapping these things.
    _a = artist.toLowerCase().replace(/[^\w]/g,'');
    _t = title.toLowerCase().replace(/[^\w]/g,'');

    // well we've seen this title before so let's swap
    if(title.length && artist.length) {
      if( 
          (Results.cache.t[_a] || 0) - (Results.cache.a[_a] || 0) +
          (Results.cache.a[_t] || 0) - (Results.cache.t[_t] || 0) > 0
        ) {
        swap = artist;
        artist = title;
        title = swap;
      }
      Results.cache.t[_t] = (Results.cache.t[_t] || 0) + 1;
      Results.cache.a[_a] = (Results.cache.a[_a] || 0) + 1;
    }
    
    // Second we don't want to return an empty title
    if(!title.trim().length) {
      title = '(no title)';
    }
    return [artist, title];
  },

  draw: function(obj) {

    // Look to see if we have generated this before.
    var 
      dom,
      dbReference = _db.find({ytid: obj.ytid});

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
        _res = Results.split(obj.title),
        artist = _res[0],
        title = _res[1],
        result = $(Results.template({
          id: obj.id,
          ytid: obj.ytid,
          title: title,
          artist: artist
        })),

        timeline = $(".timeline-container", result);

      result.hover(
        function(){ timeline.css('display','block') }, 
        function(){ 
          if (timeline.hasClass('active')) {
            return;
          }
          timeline.css('display','none') 
        }
      );

      // inlining html has fallen out of fashion for templates I know...
      result.appendTo($("#video-viewport"));

      if(isMobile) {
        timeline.click(function(e) {
          Results.mobile.timeline.call(this, e, result);
        });
      } else {
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
            var point = e.clientX - result.offset().left;// - 5;
            point = range(point, [0, _video.width]);
            Scrubber.phantom.offset = point / _video.width;
            Scrubber.phantom.dom.css("left", (point - 5) + "px");
          });
      }

      // back reference of what we are generating
      result.get(0).ytid = obj.ytid;
      result.timeline = timeline;

      _db.find({ytid: obj.ytid}).update({jqueryObject: result});

      dom = result;
    }

    _video.width = $(dom).width() + (isMobile ? -5 : 16 );
    _video.height = $(dom).height() + (isMobile ? 6 : 16 );

    // This is important. There's a mapper in
    // the generator that relies on the output
    // being the same as the in
    obj.jqueryObject = dom;
    return obj;
  },

  gen: function(opts){
    console.log(" ---- gen ---");
    opts = opts || {};
    var 
      width = $("#video-list").width() - _scrollwidth,
      height = $("#video-list").height(),
      newsearch = Results.last_query != ev('search_query'),
      top = newsearch ? 0 : $("#video-list").scrollTop(),
      bottom = height + top,
      set,
      total,
      total_height,  
      bottom_buffer,
      content_height,
      constraints = {},
      query = ev('search_query'),
      perline = Math.floor(width / _video.width),
      start = Math.floor(top / _video.height) * perline,
      stop = Math.ceil(bottom / _video.height) * perline,
      topmodoffset = top % _video.height;

    /*
    if(!query.length && !opts.force && new Date() - Results.lastGen < 300) {
      log("gen - nope", ev('app_state'));
      return false;
    }
    */

    if(query.length) {
      constraints.title = _db.current.like(query);
    }

    // There's a function that permits one to just display the related results
    // This not only show the isolated related results, but then modifies the
    // drop down menu near the related results to say as much.  This second
    // part should probably be removed and abstracted to somewhere else.
    if(ev('search_related').length) {
      var 
        allrelated = _db.main.find('ytid', _db.current.isin(ev('search_related'))).select('related'),
        unique = _.uniq(_.flatten(allrelated));

      set = _db.main.find(constraints, {ytid: _db.current.isin(unique)});
    } else {
      set = _db.main.find(constraints).sort(function(a, b) { 
        return a.id - b.id;
      });

      if(query.length) {
        Search.index(set);
      } else if(ev.isset('init') && !ev('sort')) {
        Search.reset();
      }
    }

    // We find out some statistics about what we should be
    // generating the viewport to know whether we need
    // to clear everything and try again.
    total = set.length;

    // This is the total height of the container, regardless of where we are.
    total_height = Math.ceil(total / perline + 8) * _video.height

    start = Math.max(start, 0);
    stop = Math.min(stop, total);

    content_height = Math.ceil((stop - start) / perline) * _video.height;

    // These are the two buffers of non-generation that are kept
    // at the top and the bottom of the query results. These
    // help preserve the scroll bar order.
    // 
    // We also always have at least one empty row on the bottom 
    // to make sure that the last row is always visible.
    $("#top-buffer").css('height', top - topmodoffset + "px");

    // The bottom buffer is the total height - the top buffer - viewport
    bottom_buffer = total_height - (top - topmodoffset) - content_height;

    $("#bottom-buffer").css('height',bottom_buffer + "px");
    // console.log(content_height, bottom_buffer + ( top - topmodoffset), bottom_buffer, [top - topmodoffset, top], start, stop, height, _video.height);

    //console.log(_video.old, [start,height, stop,query,total], content_height, total_height, {top: top - topmodoffset, bottom: bottom_buffer}, perline, top);
    // These are sanity checks to see if we need to regenerate
    // the viewport based on say, a user scrolling something,
    // new results coming in, old results being deleted, etc.
    //
    // It's worth noting that we key the range not based on
    // ordinals but on the ytid at the ordinals.  This is to
    // try to thwart results changing with a bunch of other
    // things not.
    if(
        // The gen can be run when there is no content to be rendered.
        // In that case, we skip it.
        newsearch || (total != Results.total) ||
        content_height && (
          opts.force || 
          _video.old.start != start || 
          _video.old.stop != stop  || 
          _video.old.query != query  || 
          _video.old.length != total ||
          _video.old.current != ev('active_track').ytid
        )
      ) {

      // If we get this far then we presume that things
      Results.lastGen = new Date();

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
      _db.current.transaction.start(); {
        var view_list = set.slice(start, stop);
        self.view_list = view_list;

        _.each(_.map(view_list, Results.draw), function(which) {

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
      } _db.current.transaction.end();

      // This is for sorting. We construct the list after the gen of the
      // elements in order to get an authortative one.
      var elementList = document.getElementById("video-viewport").children;
      for(var index = 0; index < elementList.length; index++) {
        Results.SortCompare.pre[elementList[index].ytid] = index;
      }
      // Chrome tries to accomodate for this trickery by moving around the
      // scroll on us so we undo their "smart scroll"
      $("#video-list").scrollTop(top);
    } else {
      log("gen - nope - nothing changed",  Results.last_query, ev('search_query'), ev('app_state'));
    }
    Results.last_query = ev('search_query');
    Results.total = total;

    Timeline.updateOffset();
  }
};

