<? 

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

function pl_remove($params) {
  list($id) = get($params, 'id');
  $result = run('delete from playlist where id=' . $id);
  return $result;
}

// createID:
//  params:
//    source (optional) URL of already created id to find, if exists.
//
function pl_createID($params) {
  list($source) = get($params, 'source');
  
  $result = null;

  if(!empty($source)) {
    $result = getdata(run('select id from playlist where authors="' . $source .'"'));
    if($result) { 
      return $result; 
    }
  }
  mysql_query('insert into playlist (authors) values ("' . $source .'")');
  return mysql_insert_id();
}

function pl_addTracks($params) {
  $opts = getassoc($params, 'id, tracklist');
  $id = $opts['id'];

  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);
  if(!$playlist) {
    $playlist = array();
  }

  $playlist = json_encode(array_merge($playlist, $opts['tracklist']));
  
  echo('update playlist set tracklist = \'' . $playlist . '\' where id = ' . $id);
  pl_generatePreview(Array(
    'id' => $id
  ));

  return $playlist;
}

function pl_recent() {
  return run_assoc('select 
    id, name, preview 
    from playlist 
    where 
      tracklist is not NULL and 
      name is not null and 
      preview is not null 
    order by id desc limit 20');
}

function pl_get($params) {
  list($id) = get($params, 'id');

  run('update playlist set viewcount = viewcount + 1 where id=' . $id);

  $result = run('select * from playlist where id=' . $id);
  return mysql_fetch_assoc($result);
}

function pl_update($params) {
  $opts = getassoc($params, 'id, tracklist, blacklist, name');

  foreach($opts as $key => $value) {
    // skip past the id
    if($key == 'id') {
      continue;
    }
  
    // this sounds totally unsafe, let's do it anyway. WEEEEEE, 
    // livin on the edge ... you can't help yourself from fallllinnn.
    run('update playlist set ' . $key . ' = "' . $value . '" where id = ' . $opts['id']);
  }

  pl_generatePreview(Array(
    'id' => $opts['id']
  ));
  return true;
}

