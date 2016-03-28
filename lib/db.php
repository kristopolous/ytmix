<?php
session_start();
$db_params = parse_ini_file('../secrets/db.ini');
$db_host = $db_params['host'];
$db = @mysql_connect($db_host, $db_params['user'], $db_params['password']);

if(!$db) {
  echo "Unable to connect to the server $db_host. Are you sure it's running?";
  exit(0);
}

mysql_select_db('yt', $db);
