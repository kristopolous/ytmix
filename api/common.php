<?php
// this is for things that aren't directly end points
define("NAME_OFFSET", 1);
define("YTID_OFFSET", 2);

function array_to_hash($array) {
  $hash = [];
  foreach($array as $item) {
    $hash[$item] = true;
  }
  return $hash;
}

// make sure that the track that comes in is in the right format
function sanitize_track($array) {
  $array[0] = intval($array[0]);
  return $array;
}

function addtrack($length, $title, $ytid, $author = false, $description = false) {
  $title = mysqli_real_escape_string(get_db(), $title);
  if(strlen($ytid) > 12) {
    return;
  }

  $keys = ['duration', 'title', 'ytid'];
  $values = [$length, "'${title}'", "'${ytid}'"];

  if($author) {
    $keys[] = 'author';
    // todo, if the author is not numeric we need to figure out
    // how to insert it and the channel id into the author table
    if(is_numeric($author)) {
      $values[] = "'${author}'";
    }
  }
  if($description) {
    $keys[] = 'description';
    $values[] = "'${description}'";
  }

  $keys = implode(',', $keys);
  $values = implode(',', $values);

  return run(
    "insert into tracks ($keys) values ($values)"
  );
}

if(!function_exists("dolog")) {
  function _dolog($str, $res = true, $path = 'sql.log') {
    global $g_uniq;

    // it's ok if this fails, I still want valid JSON output
    @file_put_contents(__dir__ . '/../logs/' . $path, 
      implode(' | ', [
        $g_uniq,
        date('c'),
        $res ? '1' : '0',
        substr($str, 0, 200)
      ]) . "\n", FILE_APPEND);
  }
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
    $res = false;
  }

  dolog($url, $res, 'curl.log');

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

function _get_field($id, $what) {
  // Get the id playlist
  return json_decode(
    getdata(
      run("select $what from playlist where id = $id")
    ), true
  ) ?: [];
}

function get_blacklist($id) {
  return get_field($id, 'blacklist');
}

function get_playlist($id) {
  return get_field($id, 'tracklist');
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
  $string_playlist = mysqli_real_escape_string(get_db(), json_encode(array_values($playlist)));
  if($string_playlist && strlen($string_playlist) > 0)  {
    run('update playlist set tracklist = \'' . $string_playlist . '\' where id = ' . $id);
    pl_generatePreview([ 'id' => $id ]);
  }
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
  $hash = array_merge(playlist_to_hash($playlist), array_to_hash(get_blacklist($id)));

  // If what we want to insert isn't there, then we process it.
  foreach($track_list as $item) {
    if(is_array($item)) {
      $ytid = $item[YTID_OFFSET];
    } else {
      $ytid = $item;
    }

    dolog("func", $add, "debug.log");
    if ($func == 'add') {
      if(!array_key_exists($ytid, $hash)) {
        dolog("add", $item[0], "debug.log");
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

