function addVideo(opts) {
  var 
    play = $("<a>play</a>").click(function(){ loadit(opts); }),
    queue = $("<a>queue</a>").click(function(){ loadit(opts, {noplay: true}); }),

    open = $("<a>open</a>").attr({
      target: '_blank',
      href: 'http://youtube.com/watch?v=' + opts.ytid
    }).click(Timeline.pause),

    remove = $("<a>remove</a>").click(function(){ 
      db
        .find('ytid', opts.ytid)
        .update({ hide: true }) 
      gen();
    }),

    hoverControl = $("<span class=hover>")
      .append(play)
      .append(queue)
      .append(open);

  $("<span class=result/>")
    .hover(
      function(){ hoverControl.css('display','block') }, 
      function(){ hoverControl.css('display','none') }
    )
    .append("<img src=http://i4.ytimg.com/vi/" + opts.ytid + "/default.jpg><p>" + opts.title + "</p>")
    .append(hoverControl)
    .appendTo(opts.container);
}

function gen(){
  $("#video-list").children().remove();

  _.each(db.sort('count', 'desc'), function(which) {
    addVideo(_.extend(
      {container: "#video-list"},
      which
    ));
	});
}

function login(){
  var uid = $.jStorage.get('uid');
  if(!uid) {
    remote({
      func: 'createUser',
      onSuccess: function(uid) {
        $.jStorage.set('uid', uid);
        ev.set('uid', uid);
      }
    });
  } else {
    ev.set('uid', uid);
  }
}

ev.when('app.state', function(state, meta) {
  if(state == meta.oldValue) {
    return;
  } 

  if(state == 'splash') {
    Timeline.flush();
    $(".main-app").css('display','none');
    $("#splash").css('display','block');
  } else if (state == 'main') {
    $(".main-app").css({
      opacity: 0,
      display: 'inline-block'
    }).animate({
      opacity:1
    }, 1000);

    $("#splash").css('display','none');
  }
});

function runtime(obj) {
  var total = 0;
  _.each(obj, function(which) {
    if(which && which.length) {
      total += parseInt(which.length);
    }
  });
  return total;
}

function resize(){
  var 
    width = window.innerWidth || document.body.offsetWidth,
    height = window.innerHeight || document.body.offsetHeight;

  $(".resize").css('height', (height - 225) + 'px');

  $("#video-list").css({
    height: (height - 196) + 'px',
    width: (width - 167) + 'px'
  });
}

function loadHistory(){
  _.each(Local.recent(), function(which, index) {
    var 
      total = runtime(which.data),
      container = $("<span class=splash-container>").appendTo("#splash-history"),
      forget = $("<a>forget</a>"),
      play = $("<a>play</a>"),
      hoverControl = $("<span class=hover />")
        .append(play)
        .append(forget),
      track = $("<span class=track />").append(hoverControl);

    forget.click(function(){
      Local.remove(index);
      container.slideUp();
    });

    play.click(function(){
      ev.set('app.state', 'main');

      _.each(Local.get(index), function(field) {
        loadit(field, {
          noindex: true,
          noplay: true
        });
      });

      Timeline.play(0);
    });

    for(var ix = 0; ix < Math.min(which.data.length, 4); ix++) {
      track.append("<img src=http://i4.ytimg.com/vi/" + which.data[ix].ytid + "/default.jpg>");
    }

    container
      .hover(
        function(){ hoverControl.css('display','block') }, 
        function(){ hoverControl.css('display','none') }
      )
      .append(track)
      .append("<p>" + which.name + 
         " (" + which.data.length + " track" + (which.data.length != 1 ? 's' : '') + " " 
         + Math.floor(total / 60) + ":" + ((total % 60 + 100).toString().substr(1)) + 
         ")</p>");
  });

  if(Local.recent().length) {
    $("#history").fadeIn();
  }
}

$(function(){
  var 
    dom = $("#playlist-name"), 
    input = $("<input>");

  login();

  document.getElementById('initial-search').focus();

  resize();
  $(window).resize(resize);

  loadHistory();

  ev.when('playlist.name', function(name) {
    dom.html(name);
  });

  Utils.onEnter(input, function() {
    ev.set("playlist.name", this.value);
    $(this).replaceWith(dom);
  });

  dom.click(function(){
    $(this).replaceWith(input);
    input.val(ev.get('playlist.name'));
    input.focus();
  });
});
