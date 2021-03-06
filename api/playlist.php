<?php 
mb_internal_encoding("UTF-8");
ini_set('mbstring.substitute_character', "none"); 

function author($name, $channel_id) {
  $name = mysqli_real_escape_string(get_db(), $name);
  $channel_id = mysqli_real_escape_string(get_db(), $channel_id);
  $res = getfirst(run("select id from authors where name = '$name' and channel_id = '$channel_id'"));
  if(!$res) {
    run("insert into authors (name, channel_id) values('$name', '$channel_id')");
    return last_id();
  }
  return intval($res[0]);
}

function pl_popularity($params) {
  list($id) = get($params, 'id');
  // we need to get the tracks
  $trackList = pl_getTracks($params);

  // now we need the "popularity" of each
  return getall(run('
    select ytid, title, views, total_listen from tracks 
    where ytid in ("' . implode('","', $trackList) . '")
    order by views desc
  '));
}

function pl_tracksnoauthor($params) {
  return getfirst(run("select ytid from tracks where author is null limit 50"));
}

function pl_ytupdate($params) {
  $ct = 0;
  for($ix = 0; $ix < 220; $ix ++) {
    $list = getfirst(run("select ytid from tracks where (author < 1 and author > -2) and blacklist = 0 order by ytid limit 25"));

    foreach($list as $id) {
      run(
        "update tracks set author=author-1 where ytid='$id'"
      );
    }

    $infoList = pl_ytinfo([
      'id' => implode(',', $list),
      'param' => 'snippet'
    ]);

    foreach($infoList as $row) {
      echo $ct++ . "\n";
      $id = $row['id'];
      $snippet = &$row['snippet'];
      $channel_id = $snippet['channelId'];
      $name = $snippet['channelTitle'];
      $description = $snippet['description'];
      $channel_id = author($name, $channel_id);
      run(
        "update tracks set 
          author=$channel_id, 
          description='" . mysqli_real_escape_string(get_db(), $description) . "'
          where ytid='$id'"
      );
    }
  }
}

function pl_tracks($params) {
  if(isset($params['id'])){ 
    $ytid_list = explode(',', $params['id']);
    $sql_list = "'" . implode("','", $ytid_list) . "'";
    return getall(run("select * from tracks where ytid in ($sql_list)"));
  } else {
    return getall(run("select * from tracks"));
  }
}

function pl_find($params) {
  $qstr = mysqli_real_escape_string(get_db(), $params['id']);
  $res = [];
  foreach(getall(run("select ytid from tracks where title like '%$qstr%'")) as $row) {
    $res[] = $row[0];
  }
  return $res;
}

// 
function pl_convert() {
}

//
// Adds tracks in a playlist to the tracks table.
//
function pl_normalize() {
  $row_list = getall(run('select tracklist from playlist'));
  foreach($row_list as $row) {

    if(! ($playlist_raw = $row[0]) ) {
      continue;
    }

    if(! ($playlist = json_decode($playlist_raw, true)) ) {
      continue;
    }

    foreach($playlist as $row) {
      if(is_assoc($row))  {
        extract($row);
      } else {
        list($length, $title, $ytid) = $row;
      }
      if(!addtrack($length, $title, $ytid) ) {
      }
    }
  } // foreach row list
}

// Get the names of all the playlists
function pl_names() {
  $res = [];

  $nameList = getall(run("select name from playlist where name like '%Uploads%' order by updated desc"));

  foreach($nameList as $name) {
    $candidate = str_replace("Uploads by ", "", $name[0]);
    if(strlen($candidate) > 0) {
      $res[] = $candidate;
    }
  }
  return $res;
}

function pl_authors() {
  return array_map(function($m) { return $m[0]; }, 
    getall(run("select authors from playlist where name like '%Uploads%' order by updated desc"))
  );
}

function pl_getPreview($params){
  list($id) = get($params, 'id');
  return json_decode(getdata(run("select preview from playlist where id = $id")));
}

function pl_getTracks($params) {
  list($id, $query) = get($params, 'id, param');
  $result = [];
  $index = YTID_OFFSET;
  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);

  if($playlist) {
    if(!isset($playlist[0][$index])) {
      $index = 'ytid';
    }

    foreach($playlist as $entry) {
      if($query) {
        if(strpos(strtolower($entry[NAME_OFFSET]), $query) !== false) {
          $result[] = $entry[$index];
        }
      } else {
        $result[] = $entry[$index];
      }
    }
  }
  return $result;
}

function pl_generatePreview($params) {
  list($id) = get($params, 'id');

  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);

  if($playlist && sizeof($playlist) > 0) {
    $preview = [];
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
    $preview = mysqli_real_escape_string(get_db(), json_encode($preview));

    return run('update playlist set preview="' . $preview . '" where id=' . $id);
  } else {
    return ("ok");
  }
}

function pl_clear($params) {
  list($id) = get($params, 'id');
  $result = run("update playlist set tracklist=null where id=$id");
  return $result;
}

function pl_remove($params) {
  list($id) = get($params, 'id');
  if(is_numeric($id)) {
    $result = run("delete from playlist where id=$id");
  } else {
    $result = run("delete from playlist where authors='$id'");
  }
  return $result;
}

// createID:
//  params:
//    id (optional) URL of already created id to find, if exists.
//
function pl_createID($params) {
  list($source, $param) = get($params, 'id, param');
  
  if(!empty($source)) {
    $result = getall(run("select id from playlist where authors like '%$source%' order by id desc"));

    if($result) {
      $first = array_shift($result)[0];
      $old_ids = array_map(function($m) { return $m[0]; }, $result);

      if(count($old_ids) > 0) {
        $result = run('delete from playlist where id in (' . implode(',', $old_ids) . ')');
      }

      return $first;
    }
  }

  if(empty($param)) {
    $param = 0;
  }
  mysqli_query(get_db(), "insert into playlist (authors, name, type, method) values ('$source', 'Uploads by $source', $param, '{}')");
  // echo("insert into playlist (authors, name, type, method) values ('$source', 'Uploads by $source', $param, '{}')");
  return mysqli_insert_id(get_db());
}

// Methods are how a track got into the playlist. In order to keep the payload of the playlist
// brief, they are given ids and then referenced here.
// Its {method_name: short_code}
function pl_addMethod($params) {
  list($id, $param) = get($params, 'id, param');

  $method = json_decode(getdata(run('select method from playlist where id=' . $id )), true);

  if(array_key_exists($param, $method)) {
    return $method[$param];
  } 

  $value = base_convert(count($method) + 1, 10, 36);
  $method[$param] = $value;
  $string_method = mysqli_real_escape_string(get_db(), json_encode($method));
  run('update playlist set method = \'' . $string_method . '\' where id = ' . $id);
  return $value;
}

function pl_addTracks($params) {
  return modify_tracks($params, 'add');
}

function pl_delTracks($params) {
  return modify_tracks($params, 'del');
}

function pl_updateDuration($params) {
  $opts = getassoc($params, 'id, param');
  return run("update tracks set total_listen = total_listen + " . $opts['param'] . " where ytid = '" . $opts['id'] . "'");
}

function pl_addListen($params) {
  $opts = getassoc($params, 'id, title, length');
  $id = "'" . $opts['id'] . "'" ;
  $length = $opts['length'];
  $res = run_assoc("select * from tracks where ytid = $id");
  if(!$res) {
    addtrack($opts['length'], $opts['title'], $opts['id']);
  } 
  return run("update tracks set duration = $length, views = views + 1, last = current_timestamp where ytid = $id");
}

function pl_updateTrack($params) {
  list($id, $param, $value) = get($params, 'id, param, extra');
  $value = $value[0];

  if(!is_numeric($value) && $value != 'true' && $value != 'false') {
    $value = "'$value'";
  }
  return run("update tracks set $param = $value, last = now() where ytid = '$id'");
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

function pl_recent($params) {
  list($page) = get($params, 'id');
  $page = intval($page ? $page : '0');
  $count = 50;
  $skip = $page * $count;
  $res = run_assoc("select 
    id, name, preview 
    from playlist 
    where 
      preview is not null and
      type = 0
    order by updated desc limit $skip, $count");
  $key = [['preview']];
  return toJson($res, $key);
}

function pl_get($params) {
  list($id) = get($params, 'id');

  if($id) {
    //run('update playlist set viewcount = viewcount + 1 where id=' . $id);

    $result = run("select * from playlist where id=$id");
    $data = mysqli_fetch_assoc($result);
    return toJson($data, ['tracklist', 'preview', 'blacklist', 'method']);
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

  $pdo = get_pdo();
  foreach($opts as $key => $value) {
    // skip past the id
    if($key == 'id') {
      continue;
    }

    // Make sure that the value isn't empty
    if(empty($value)) {
      continue;
    }
    if($key == 'tracklist') {
      $value = mb_convert_encoding($value, 'ASCII', 'UTF-8'); 
      $attempt = json_decode(stripslashes($value));
      if(!$attempt) {
        continue;
      }
    }
  
    $statement = $pdo->prepare("update playlist set $key = ? where id = ?");
    $res = $statement->execute([$value, $opts['id']]);
  }

  if(isset($opts['blacklist'])) {
    $blacklist = json_decode($opts['blacklist']);
    if($blacklist) {
      run('update tracks set blacklist = true where ytid in ("' . implode('","', $blacklist) . '")');
    }
  }

  // make sure that the recent update sends it to the top.
  run('update playlist set updated=now() where id = ' . $opts['id']);

  pl_generatePreview(['id' => $opts['id']]);
  return true;
}

function pl_exists($params) {
  $res = [];
  stream_context_set_default(['http' => [ 'method' => 'HEAD' ]]);

  extract($params);
  $id_list = explode(',', $id);

  foreach($id_list as $id) {
    $header = get_headers("http://i4.ytimg.com/vi/$id/default.jpg");
    $res[$id] = (substr($header[0], 9, 3) != '404');
  }
  return $res;
}

