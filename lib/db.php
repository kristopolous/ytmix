<?php
session_start();

$_db = false;
$_pdo = false; 

function get_pdo() {
  global $_pdo;
  if(!$_pdo) {
    $db_params = parse_ini_file('../secrets/db.ini');
    $db_host = $db_params['host'];
    $db   = 'yt';
    $user = $db_params['user'];
    $pass = $db_params['password'];
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$db_host;dbname=$db;charset=utf8";//$charset";
    $options = [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
      PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8" 
    ];
    try {
      $_pdo = new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
      throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
  }
  return $_pdo;
}

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
