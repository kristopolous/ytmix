<?php 

// make sure that the track that comes in is in the right format
function sanitize_track($array) {
  $array[0] = intval($array[0]);
  return $array;
}

function pl_getPreview($params){
  list($id) = get($params, 'id');
  return getdata(run("select preview from playlist where id = $id"));
}

function pl_getTracks($params) {
  list($id) = get($params, 'id');
  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);

  $result = array();
  foreach($playlist as $entry) {
    $result[] = $entry[2];
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

function pl_addTracks($params) {
  $opts = getassoc($params, 'id, param');

  // Make sure that the object passed in is interpreted.
  if(gettype($opts['param']) == 'string') {
    $opts['param'] = json_decode($opts['param'], true);
  }
  $id = $opts['id'];

  // Get the current playlist
  $playlist = json_decode(
    getdata(
      run("select tracklist from playlist where id = $id")
    ), true
  );

  if(!$playlist) {
    $playlist = array();
  }

  // Make a map of it
  $hash = Array();
  foreach($playlist as $item) {
    $hash[$item[2]] = $item;
  }

  // If what we want to insert isn't there, then we process it.
  foreach($opts['param'] as $item) {
    if(!array_key_exists($item[2], $hash)) {
      $playlist[] = sanitize_track($item);
    }
  }

  $string_playlist = mysql_real_escape_string(json_encode($playlist));
  
  run('update playlist set tracklist = \'' . $string_playlist . '\' where id = ' . $id);

  pl_generatePreview(Array( 'id' => $id));

  return true;
}

function pl_recent() {
  $res = run_assoc('select 
    id, name, preview 
    from playlist 
    where 
      preview is not null and
      type = 0
    order by id desc limit 20');
  $key = Array(Array('preview'));
  return toJson($res, $key);
}

function pl_get($params) {
  list($id) = get($params, 'id');

  if($id) {
    run('update playlist set viewcount = viewcount + 1 where id=' . $id);

    $result = run('select * from playlist where id=' . $id);
    $data = mysql_fetch_assoc($result);
    return toJson($data, Array('tracklist', 'preview', 'blacklist'));
  } else {
    return run_assoc('select id, name from playlist where preview is not null');
  }
}

function pl_update($params) {
  $opts = getassoc($params, 'id, tracklist, blacklist, name');

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

  pl_generatePreview(Array( 'id' => $opts['id']));
  return true;
}

