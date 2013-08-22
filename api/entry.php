<?
include ('../lib/common.php');
include ('playlist.php');
include ('favorite.php');
include ('ytsearch.php');

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
