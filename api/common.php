<?php
// this is for things that aren't directly end points
define("YTID_OFFSET", 2);

// make sure that the track that comes in is in the right format
function sanitize_track($array) {
  $array[0] = intval($array[0]);
  return $array;
}

function addtrack($length, $title, $ytid) {
  $title = mysql_real_escape_string($title);
  return run(
    "insert into tracks (duration, title, ytid) values ($length, '$title', '$ytid')"
  );
}

function yt_query($opts = []) {

  $ep = 'search';
  if(isset($opts['ep'])) {
    $ep = $opts['ep'];
    unset($opts['ep']);
  }

  if( !($auth_key = yt_authkey()) ) {
    return false;
  }

  $opts['key'] = $auth_key;

  $params = http_build_query($opts);
  $url = "https://www.googleapis.com/youtube/v3/$ep?$params";

  $raw = file_get_contents($url);

  if ( !($res = @json_decode($raw, true)) ) {
    return false;
  }

  return $res;
}

function is_assoc($array) {
  foreach (array_keys($array) as $k => $v) {
    if ($k !== $v) {
      return true;
    }
  }
  return false;
}

function get_playlist($id) {
  // Get the id playlist
  $playlist = json_decode(
    getdata(
      run("select tracklist from playlist where id = $id")
    ), true
  );

  if(!$playlist) {
    $playlist = array();
  }
  return $playlist;
}

function playlist_to_hash($playlist) {
  // Make a map of it
  $hash = Array();
  $index = 0;

  foreach($playlist as $item) {
    $hash[$item[YTID_OFFSET]] = $index;
    $index ++;
  }
  return $hash;
}

function set_playlist($id, $playlist) {
  $string_playlist = mysql_real_escape_string(json_encode(array_values($playlist)));
  
  run('update playlist set tracklist = \'' . $string_playlist . '\' where id = ' . $id);

  pl_generatePreview(Array( 'id' => $id ));
}

// This adds or removes tracks to an existing playlist - this is a relatively safe method.
function modify_tracks($params, $func) {
  $opts = getassoc($params, 'id, param');
  $track_list = [];

  // Make sure that the object passed in is interpreted.
  if(gettype($opts['param']) == 'string') {
    $json = json_decode($opts['param'], true);
    if($json) {
      $track_list = $json;
    } else {
      $track_list = [$opts['param']];
    }
  } else {
    $track_list = $opts['param'];
  }
  $id = $opts['id'];

  $playlist = get_playlist($id);
  $hash = playlist_to_hash($playlist);

  // If what we want to insert isn't there, then we process it.
  foreach($track_list as $item) {
    if(is_array($item)) {
      $ytid = $item[YTID_OFFSET];
    } else {
      $ytid = $item;
    }

    if ($func == 'add') {
      if(!array_key_exists($ytid, $hash)) {
        // add the track to our list of known tracks
        addtrack($item[0], $item[1], $item[2]);

        // place it at the end of the playlist
        $playlist[] = sanitize_track($item);
      }
    } else if ($func == 'del') {
      // If this is in the playlist, then we add that to the delete list.
      if(isset($hash[$ytid])) {

        // unset doesn't shift things ... really.
        unset( $playlist[ $hash[$ytid] ] );
      }
    }
  }

  set_playlist($id, $playlist);

  return true;
}

