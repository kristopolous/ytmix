<?php
session_start();

$_db = false;
$_pdo = false; 

function get_pdo() {
  global $_pdo;
  if(!$_pdo) {
    $db_path = __DIR__ . '/../db/yt.db';
    $dsn = "sqlite:$db_path";
    $options = [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    try {
      $_pdo = new PDO($dsn, null, null, $options);
    } catch (\PDOException $e) {
      throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
  }
  return $_pdo;
}

function get_db() {
  global $_db;
  if(true) { //!$_db) {
    $db_path = realpath(__DIR__ . '/../db/yt.db');
    if (!$db_path) {
      $db_path = __DIR__ . '/../db/yt.db';
    }
    try {
      $_db = new SQLite3($db_path);
    } catch (Exception $e) {
      error_log("Unable to connect to the database at $db_path: " . $e->getMessage());
      echo "Unable to connect to the database at $db_path: " . $e->getMessage();
      exit(0);
    }
  } else {
    error_log("reusing");
  }
  return $_db;
}
