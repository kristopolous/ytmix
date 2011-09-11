var 	
	sortOrder = 'AGE',
  serverSearched = {},
  results = {},
	query = false,
  splash = true,
  ev = EvDa(),
  db = DB();

db.constrain('unique', 'ytid');

function sort(mode, el) {
	sortOrder = mode;

	$(el)
    .addClass('selected')
    .siblings()
    .removeClass('selected');

	gen();
}

function gen(){
	var emit = db.find({hide: db(' !== true')});

	if(sortOrder == 'HISTORY') {
    var list = DB(_.values(Timeline.data))
      .sort('index', 'asc')
      .select('ytid');

    emit = db.find({
      ytid: db.isin(list)
    });

	} else {
    emit = db.sort({
      ALPHA: 'title',
      COUNT: 'count',
      AGE: 'lastseen'
    }[sortOrder], 'ASC');
	}

	if(query) {
		var qstr = new RegExp('(' + query + ')', 'ig');

    emit = db.find({
      ytid: db.isin(emit.select('ytid')),
      title: function(test) {
        return test.search(qstr);
      }
    });
	}

  $("#video-list").html('');

  _.each(emit, function(which) {
    var 
      play = $("<a />").html('play').click(function(){
        loadit(which.ytid);
      }),
      queue = $("<a />").html('queue').click(function(){
        ev.set('noplay');
        loadit(which.ytid);
        ev.unset('noplay');
      }),
      remove = $("<a />").html('remove').click(function(){
        results.remove(which.ytid)
      }),
      hoverControl = $("<span class=hover>")
        .append(play)
        .append(queue)
        .append(remove);

    $("#video-list").append(
      $("<span />")
        .hover(function(){
          hoverControl.css('display','block')
        }, function(){
          hoverControl.css('display','none')
        })
        .append("<img src=http://i4.ytimg.com/vi/" + which.ytid + "/default.jpg><p>" + which.title + "</p>")
        .append(hoverControl)
    );
	});
}

//
// Adds vids in the format
// [ [ytid, title] ... ]
//
function addVids(vidList) {

  // insert each related video into our
  // db of known videos if needed
  _.each(vidList, function(video) {
    db.insert({
      title: video[0],
      ytid: video[1]
    }).update(function(data){
      try{
        if(!data.reference) {
          data.reference = [];
        }
      } catch(ex) {
        console.log("FAILED >> ", video, data);
      }
      data.count = data.reference.length;

      if(!data.removed) {
        data.removed = 0;
      }
    });
  })
}

function search(query) {
  transition();

  Store.create();

  if(query.slice(0,5).toLowerCase() == 'http:') {
    var parts = query.split(/[\.=&#?]/);

    for(var ix = 0, len = parts.length; ix < len; ix++){

      if(parts[ix] == 'v') {

        loadit(parts[ix + 1]);
        return;
      }
    }
  }

  $("#query")
    .val(query)
    .css('background', 'url(w.png)')
    .blur(); 

	if(query.length == 0) {
		query = false;
	  gen();
  } else {
    if(!serverSearched[query]) {
      serverSearched[query] = true;

      $.getJSON('api/yt_search.php',
        {q: query}, 
        function(data) {
          serverSearched[query] = _.map(data, function(which) {
            return which[1];
          });

          addVids(data);
          gen();
        });
    }
  }
}

results.remove = function(ytid){
  db.find('ytid', ytid).update({
    hide: true
  });
  gen();
}

function loadit(ytid){
  ev.isset('flash.load', function(){
    if(!db.findFirst({ytid: ytid}).serverData) {

      var id = Timeline.add(ytid);

      $.getJSON(
        'api/related.php',
        {v: ytid}, 

        function (data){
          db.insert({
            ytid: ytid
          }).update({
            removed: 0,
            count: 0,
            length: data.length,
            title: Utils.clean(data.title),
            related: _.map(data.related, function(which) {
              return which[1];
            }),
            serverData: data
          });

          addVids(data.related);
      
          Timeline.update(id);

          gen();
        });
    } else {
      Timeline.add(ytid);
    }
  });
}

function transition(){
  if(!splash) {
    return;
  }

  splash = false;

  $(".main-app").css({
    opacity: 0,
    display: 'inline-block'
  }).animate({
    opacity:1
  }, 1000);

  $("#splash").css('display','none');
  $("#top").animate({opacity: 0.8}, 200);
}

function resize(){
  var height = window.innerHeight || document.body.offsetHeight;
  $("#video-list").css('height', (height - 240) + 'px')
}

function loadHistory(){
  if(Store.recent().length) {
    $("#history").css('display','inline-block');
  }

  _.each(Store.recent(), function(which, index) {
    var 
      container,
      forget,
      play;

    forget = $("<button>forget</button>").click(function(){
      Store.remove(index);
      container.slideUp();
    });

    play = $("<button>play</butotn>").click(function(){
      transition();
      ev.set('noplay');
      _.each(Store.get(index), loadit);
      ev.unset('noplay');
      Timeline.play(0);
    });

    container = $("<span class=splash-container>").append(
      $("<span class=track>")
        .append("<img src=http://i4.ytimg.com/vi/" + which[0] + "/default.jpg><p>" + which[1] + "</p>")
       ).append(
         $("<div />").append(forget).append(play)
       ).appendTo("#splash-history");
  });
}

$(function(){
  $("#clear-search").click(function(){
    search("");
  });


	$(".toggle").mousedown(function(e){
		e.preventDefault();
	});

  Utils.onEnter(".query", function(){
    search(this.value);
  });

  $("#initial-search").focus();

  loadHistory();

  $("#now").css('opacity',0.6).draggable({
    axis: 'x',
    drag: function(){
      $("#scale").css('margin-left', $("#now").offset().left);
    },
    stop: function() {
      $("#scale").css('margin-left', $("#now").offset().left);
    }
  });

  resize();

  $(window).resize(resize);
});
