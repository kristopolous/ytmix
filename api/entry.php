<?php
include ('common.php');
include ('../lib/common.php');
include ('playlist.php');
include ('user.php');
include ('ytsearch.php');

function pl_help($message = false) {
  $list = get_defined_functions()['user'];
  $func = [];
  foreach($list as $name) {
    if(preg_match('/^pl_/', $name)) {
      $func[] = substr($name, 3);
    }
  }
  sort($func);
  return result(true, $func, $message);
}

if(isset($_REQUEST['func'])) {
  $parts = explode('.', $_REQUEST['func']);
  unset($_REQUEST['func']);

  $request = array_shift($parts);
} else {
  $request = 'help';
}

$to_run = "pl_$request";

// you can put a .txt on the end of an api call to retrieve it in 
// non json format.
$extension = array_shift($parts) ?: 'json';

if(function_exists($to_run)) {
  $result = $to_run ( $_REQUEST );
  if(hasError()) {
    $res = result(false, getError());
  } else {
    $res = result(true, $result);
  }
  if($extension === 'json') {
    echo json_encode($res);
  } else {
    echo implode("\n", $res['result']);
  }
}
