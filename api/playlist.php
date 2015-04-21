<?php 

define("YTID_OFFSET", 2);

// make sure that the track that comes in is in the right format
function sanitize_track($array) {
  $array[0] = intval($array[0]);
  return $array;
}

function pl_names() {
  $res = [];
  $nameList = getall(run("select name from playlist where name like '%Uploads%'"));
  foreach($nameList as $name) {
    $res[] = str_replace("Uploads by ", "", $name[0]);
  }
  return $res;
}

function pl_getPreview($params){
  list($id) = get($params, 'id');
  return json_decode(getdata(run("select preview from playlist where id = $id")));
}

function pl_getTracks($params) {
  list($id) = get($params, 'id');
  $index = YTID_OFFSET;
  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);

  if(!isset($playlist[0][$index])) {
    $index = 'ytid';
  }

  $result = array();
  foreach($playlist as $entry) {
    $result[] = $entry[$index];
  }
  echo implode("\n", $result);
  exit(0);
}

function pl_generatePreview($params) {
  list($id) = get($params, 'id');

  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);

  if($playlist && sizeof($playlist) > 0) {
    $preview = Array();
    $preview['tracks'] = $firstFour = array_slice($playlist, 0, 4);
    $length = 0;
    foreach($playlist as $entry) {
      if(!empty($entry[0])) {
        $length += $entry[0];
      } else if(!empty($entry['length'])) {
        $length += $entry['length'];
      }
    }
    $preview['length'] = $length;
    $preview['count'] = count($playlist);
    $preview = mysql_real_escape_string(json_encode($preview));
    return run('update playlist set preview="' . $preview . '" where id=' . $id);
  } else {
    return ("ok");
  }
}

function pl_clear($params) {
  list($id) = get($params, 'id');
  $result = run('update playlist set tracklist=null where id=' . $id);
  return $result;
}

function pl_remove($params) {
  list($id) = get($params, 'id');
  $result = run('delete from playlist where id=' . $id);
  return $result;
}

// createID:
//  params:
//    id (optional) URL of already created id to find, if exists.
//
function pl_createID($params) {
  list($source, $param) = get($params, 'id, param');
  
  if(!empty($source)) {
    $result = getdata(run('select id from playlist where authors="' . $source .'"'));
    if($result) { 
      return $result; 
    }
  }

  if(empty($param)) {
    $param = 0;
  }
  mysql_query('insert into playlist (authors, type, method) values ("' . $source .'", ' . $param . ', "{}")');
  return mysql_insert_id();
}

// Methods are how a track got into the playlist. In order to keep the payload of the playlist
// brief, they are given ids and then referenced here.
// Its {method_name: short_code}
function pl_addMethod($params) {
  list($id, $param) = get($params, 'id, param');

  $method = json_decode(getdata(run('select method from playlist where id=' . $id )), true);

  if(array_key_exists($param, $method)) {
    return $method[$param];
  } else {
    $value = base_convert(count($method) + 1, 10, 36);
    $method[$param] = $value;
    $string_method = mysql_real_escape_string(json_encode($method));
    run('update playlist set method = \'' . $string_method . '\' where id = ' . $id);
    return $value;
  }
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

  // Make sure that the object passed in is interpreted.
  if(gettype($opts['param']) == 'string') {
    $opts['param'] = json_decode($opts['param'], true);
  }
  $id = $opts['id'];

  $playlist = get_playlist($id);
  $hash = playlist_to_hash($playlist);

  // If what we want to insert isn't there, then we process it.
  foreach($opts['param'] as $item) {
    $ytid = $item[YTID_OFFSET];

    if ($func == 'add') {
      if(!array_key_exists($ytid, $hash)) {
        // place it at the end
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

function pl_addTracks($params) {
  return modify_tracks($params, 'add');
}

function pl_delTracks($params) {
  return modify_tracks($params, 'del');
}

function pl_swapTracks($params) {
  $opts = getassoc($params, 'id, param');

  $oldList = $opts['param']['old'];
  $newList = $opts['param']['new'];

  $playlist = get_playlist($opts['id']);
  $hash = playlist_to_hash($playlist);

  $index = 0;

  // look to see if the ytids from the old list are there.
  foreach($oldList as $item) {
    $ytid = $item[YTID_OFFSET];

    // if they are then we replace them with the new ones.
    if(array_key_exists($ytid, $hash)) {
      $playlist[ $hash[$ytid] ] = sanitize_track($newList[ $index ]);
    }

    // and move our little pointer along
    $index ++;
  }

  set_playlist($id, $playlist);

  return true;
}

function pl_recent() {
  $res = run_assoc('select 
    id, name, preview 
    from playlist 
    where 
      preview is not null and
      type = 0
    order by updated desc limit 90');
  $key = Array(Array('preview'));
  return toJson($res, $key);
}

function pl_get($params) {
  list($id) = get($params, 'id');

  if($id) {
    //run('update playlist set viewcount = viewcount + 1 where id=' . $id);

    $result = run('select * from playlist where id=' . $id);
    $data = mysql_fetch_assoc($result);
    return toJson($data, Array('tracklist', 'preview', 'blacklist', 'method'));
  } else {
    return run_assoc('select id, name from playlist where preview is not null');
  }
}

function pl_update($params) {
  $opts = getassoc($params, 'id, tracklist, blacklist, name');

/*
  if(isset($opts['tracklist'])) {
    return doError("Can't update tracklist atomically like that");
  }
*/

  foreach($opts as $key => $value) {
    // skip past the id
    if($key == 'id') {
      continue;
    }

    // Make sure that the value isn't empty
    if(empty($value)) {
      continue;
    }
  
    // this sounds totally unsafe, let's do it anyway. WEEEEEE, 
    // livin on the edge ... you can't help yourself from fallllinnn.
    run('update playlist set ' . $key . ' = "' . $value . '" where id = ' . $opts['id']);
  }

  // make sure that the recent update sends it to the top.
  run('update playlist set updated=now() where id = ' . $opts['id']);

  pl_generatePreview(Array( 'id' => $opts['id']));
  return true;
}

