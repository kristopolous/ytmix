<? 

include ('../lib/common.php');
// To make life easy
include ('favorite.php');

function pl_getUser() {
  result('true', uniqid('', true));
}

function pl_getPreview($params){
  list($id) = get($params, 'id');
  return getdata(run("select preview from playlist where id = $id"));
}

function pl_generatePreview($params) {
  list($id) = get($params, 'id');
  $playlist = json_decode(getdata(run("select tracklist from playlist where id = $id")), true);
  $preview = Array();
  $preview['tracks'] = $firstFour = array_slice($playlist, 0, 4);
  $length = 0;
  foreach($playlist as $entry) {
    if(!empty($entry[0])) {
      $length += $entry[0];
    } else {
      $length += $entry['length'];
    }
  }
  $preview['length'] = $length;
  $preview['count'] = count($playlist);
  $preview = mysql_real_escape_string(json_encode($preview));
  return run('update playlist set preview="' . $preview . '" where id=' . $id);
}

function pl_remove($params) {
  list($id) = get($params, 'id');
  $result = run('delete from playlist where id=' . $id);
  return $result;
}

function pl_createID() {
  mysql_query('insert into playlist values ()');
  return mysql_insert_id();
}

function pl_recent() {
  return run_assoc('select id, name, preview from playlist where tracklist is not NULL order by id desc limit 20');
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

if(function_exists('pl_' . $_REQUEST['func'])) {
  $toRun = 'pl_' . $_REQUEST['func'];
  unset($_REQUEST['func']);

  $result = $toRun ( $_REQUEST );
  if(is_string($result)) {
    result(false, $result);
  } else { 
    result(true, $result);
  }
} else {
  result(false, 'Function not found');
}
