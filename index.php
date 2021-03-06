<!doctype html>
<html lang="en">

  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#221122">

    <title>Audisco :: Discover new music every day</title>
    <link rel="stylesheet" href="css/style.css"> 
    <link rel="stylesheet" href="css/font-awesome.min.css"> 
  </head>

  <body>
    <div class="main-app">
      <div id="header">
        <span class="controls">
          <a class="previous-track button"><i class="fa fa-backward"></i></a><a class="pause-play button"><i class="fa fa-stop"></i></a><a class="next-track button"><i class="fa fa-forward"></i></a><a class="volume button" id="volume-down"><i class="fa fa-minus"></i></a><a class="volume button" id="volume-up"><i class="fa fa-plus"></i></a>
        </span>
        <span id="status">
          <div class="message"></div>
          <div class="mask"></div>
        </span>
        <span id="search" class="control-wrapper">
          <span id="search-context">
            <span id="search-context-title"></span>
            <span id="search-context-dropdown"></span>
          </span>
          <input id="normal-search" class="search">
          <a class="button" id="use-internet"><i class="fa fa-globe"></i></a>
        </span>
      </div>
      <div id="lower">
        <div id="deck-control">
          <a id="sort" class="button"><i class="fa fa-sort-alpha-asc" aria-hidden="true"></i></a>
          <a id="scroll-to" class="button">Scroll</a>
          <input type='text' value='Youtube-dl' onclick='ytButton(this)' class="button" id="clipboard-button">
          <span id='quality-control'>Quality:<a class="button" id="quality-down">&#x25BC;</a><a class="button" id="quality-up">&#x25B2;</a></span>
          <span class='mobile'>
            <a class='button' id="search-mobile"><i class="fa fa-search" aria-hidden="true"></i></a>
            <a class="previous-track button"><i class="fa fa-backward"></i></a><a class="pause-play button"><i class="fa fa-stop"></i></a><a class="next-track button"><i class="fa fa-forward"></i></a>
          </span>
        </div>
        <span class="control-wrapper">
          <a class="button" id="remove-name">remove</a>
          <b id="playlist-name">Untitled</b>
          <a class="button" id="edit-name">edit</a>
        </span>
      </div>
      <div id="bottom-box">
        <span class="resize" id="video-list">
        <div id="result-now" class="now"></div>
        <div id="top-buffer"></div>
        <div id="video-viewport"></div>
        <div id="bottom-buffer"></div>
        </span>
      </div>
    </div>

    <div id="splash" class="container">
      <div class="hero-unit">
        <h1>audisco</h1>
        <input id="initial-search" class="search" />
        <!--<a class="button" id="favorites-link">Your Favorites</a>-->
      </div>
      <div id="history">
        <div id="splash-history"></div>
      </div>
    </div>

  <div id="offscreen">
    <div id="players"></div>
    <div class="scrubber" id="phantom-scrubber"></div>
    <div class="scrubber" id="real-scrubber"></div>
    <div id="player-iframe-0"></div>
    <div id="player-iframe-1"></div>
  </div>

  <div id="debug"></div>

  <object id="backupPlayer" width="420" height="315"></object>

  <div id='template'>
    <script id="t-backup" type="text/template">
      <param 
        name="movie" 
        value="http://www.youtube.com/v/<%=ytid%>?autoplay=1&amp;start=<%=offset%>&amp;version=3&amp;hl=en_US" 
      ></param>

      <param 
        name="allowscriptaccess" 
        value="always"
      ></param>

      <embed 
        src="http://www.youtube.com/v/<%=ytid%>?autoplay=1&amp;start=<%=offset%>&amp;version=3&amp;hl=en_US" 
        type="application/x-shockwave-flash" 
        width="420" 
        height="315" 
        allowscriptaccess="always"
      ></embed>
    </script>

    <script id='t-resultMobile' type='text/template'>
      <span class="result-container">
        <span class="result">
          <a class="thumbnail" onclick="Timeline.pause()" target="_blank" href="http://www.youtube.com/watch?v=<%= ytid %>"><img src="https://i.ytimg.com/vi/<%= ytid %>/default.jpg"></a>
          <span>
            <p>
              <em><%= artist %></em>
              <%= song %>
            </p>
          </span>
          <div data-id="<%= ytid %>" class="timeline-container"><div class="timeline-outer"><div class="timeline-inner"></div></div></div>
        </span>
      </span>
    </script>
  
    <script id="t-resultDesktop" type='text/template'>
      <span class="result">
        <a class="thumbnail" onclick="Timeline.pause()" target="_blank" href="https://www.youtube.com/watch?v=<%= ytid %>"><img src="https://i.ytimg.com/vi/<%= ytid %>/default.jpg"></a>
        <span>
          <p>
            <em>
              <a onclick="Search.artist('<%= artist %>')">
                <%= artist %>
              </a>
            </em>
            <a onclick="Search.related('<%= ytid %>')">
              <%= song %>
            </a>
          </p>
        </span>
        <div data-id="<%= ytid %>" class="timeline-container"><div class="timeline-outer"><div class="timeline-inner"></div></div></div><a onclick="Timeline.remove('<%= ytid %>')" class="remove fa fa-times"></a><a onclick="replace(<%= id %>,true)" class="reload fa fa-refresh"></a>
      </span>
    </script>

    <script id="t-splash" type='text/template'>
      <a title="<%= id %>" onclick="Timeline.load(<%= id %>)" class="splash-container span3">
        <img src="https://i.ytimg.com/vi/<%= ytList[0][2] %>/default.jpg">
        <p><%= title %>
          <small>(<%= count %> tracks <%= duration %>)</small>
        </p>
      </a>
    </script>
  </div>

  </body>

  <!-- Dependencies { -->
    <script src="js/min/damerau-levenshtein.js"></script>
    <script src="js/raw/db.js"></script>
    <script src="js/min/jquery.js"></script>
    <script src="js/min/underscore.js"></script>
    <script src="js/raw/evda.js"></script>
  <!-- } -->

  <!-- Application { -->
    <script src="js/_init_.js"></script>
    <script src="js/desktop.js"></script>
    <script src="js/mobile.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/search.js"></script>
    <script src="js/store.js"></script>
    <script src="js/timeline.js"></script>
    <script src="js/toolbar.js"></script>
    <script src="js/results.js"></script>
    <script src="js/app.js"></script>
    <script src="js/hash.js"></script>
  <!-- } -->

    <script>
    var AUTH_KEY = "<?php echo trim(file_get_contents('secrets/authkey')); ?>";
    </script>
</html>
