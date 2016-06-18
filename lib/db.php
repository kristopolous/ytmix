<?php
session_start();

$_db = false;
function get_db() {
  global $_db;
  if(!$_db) {
    $db_params = parse_ini_file('../secrets/db.ini');
    $db_host = $db_params['host'];
    $_db = @mysqli_connect($db_host, $db_params['user'], $db_params['password'], 'yt');

    if(!$_db) {
      echo "Unable to connect to the server $db_host. Are you sure it's running?";
      exit(0);
    }
  }
  return $_db;
}
