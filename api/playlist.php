<? 

include ('../lib/common.php');

function pl_getUser() {
  result('true', uniqid('', true));
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
  $result = run('select * from playlist where tracklist is not NULL order by id desc limit 8');
  $ret = Array();
  while($ret[] = mysql_fetch_assoc($result));
  
  return $ret;
}

function pl_get($params) {
  list($id) = get($params, 'id');

  run('update playlist set viewcount = viewcount + 1 where id=' . $id);

  $result = run('select * from playlist where id=' . $id);
  return mysql_fetch_assoc($result);
}

function pl_update($params) {
  list($id, $tracklist, $name) = get($params, 'id, data, name');


  if($tracklist) {
    run('update playlist set tracklist="' . $tracklist . '" where id=' . $id);
  }

  if($name) {
    run('update playlist set name="' . $name . '" where id=' . $id);
  }

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
