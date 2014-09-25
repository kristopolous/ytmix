<?php
include ('../lib/common.php');
include ('playlist.php');
include ('user.php');
include ('ytsearch.php');

function pl_help($message = false) {
  $list = get_defined_functions()['user'];
  $func = array();
  foreach($list as $name) {
    if(preg_match('/^pl_/', $name)) {
      $func[] = substr($name, 3);
    }
  }
  sort($func);
  result(true, $func, $message);
}


if(isset($_REQUEST['func']) && function_exists('pl_' . $_REQUEST['func'])) {
  $toRun = 'pl_' . $_REQUEST['func'];
  unset($_REQUEST['func']);

  $result = $toRun ( $_REQUEST );
  if(hasError()) {
    result(false, getError());
  } else {
    result(true, $result);
  }
} else {
  return pl_help($_REQUEST);
}
