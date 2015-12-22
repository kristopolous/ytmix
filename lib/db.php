<?php
session_start();
$db_host = 'localhost';
$db = @mysql_connect($db_host, 'root', '');

if(!$db) {
  echo "Unable to connect to the server $db_host. Are you sure it's running?";
  exit(0);
}

mysql_select_db('yt', $db);
//date_default_timezone_set("America/Los_Angeles");
//define("YT-DEVKEY", "AI39si5NzWIiUYbOU5apApD9fKp2DsAcIN094TqmfjnQitcv8Fkc-wvJePeDP2IP0E11UJPZohD4dbSkyQnRBSqgVZC314tR_w");
