<?php
include ('db.php');
$g_uniq = uniqid();
$g_error_stack = array();
$g_rows_affected = 0;

function trace(){
  static $which = 0;

  $d = debug_backtrace();
  $ws = "\n  " . implode(' ', array_fill(0, strlen((string)$d[0]['line']), ''));

  $pre = '';
  if($which++ == 0) {
    $pre = "\n--- " . date(DATE_RFC822) . "\n";
  }

  error_log(
   $pre .
   $d[0]['line'] . " " .  $d[1]['function'] . 
   "(" . var_export($d[1]['args'], true) . ") " . 
    implode('/', array_slice(
        explode('/', $d[0]['file']),
        -3, 3
      )
    ) . 
    $ws . var_export(func_get_args(), true) .  "\n",
    3, 
    "/tmp/mydebug"
  );
}

function hasError() {
  global $g_error_stack;
  return count($g_error_stack) > 0;
}
function doError($str) {
  global $g_error_stack;
  $g_error_stack[] = $str;
  return false;
}
function getError() {
  global $g_error_stack;
  return $g_error_stack;
}

function result($succeed, $message, $extra = false) {
  if(!$extra) {
    return [
      'status' => $succeed,
      'result' => $message
    ];
  } else {
    return [
      'status' => $succeed,
      'result' => $message,
      'message' => $extra
    ];
  }
}

function sanitize($opts) {
  foreach ($opts as $k => $v) {
    if(gettype($v) == 'string') {
      $opts[$k] = mysqli_real_escape_string(get_db(), $v);
    }
  }
  return $opts;
}

function toJson(&$data, $decode = Array()) {
  if($data) {
    foreach($decode as $field) {
      if(gettype($field) == 'array') {
        foreach($data as &$child) {
          toJson($child, $field);
        }
      } else {
        $data[$field] = json_decode($data[$field], true);
      }
    }
  }
  return $data;
}

function yt_authkey() {
  if(file_exists('../secrets/authkey')) {
    return file_get_contents('../secrets/authkey');
  } 
  return null;
}

function getfirst($sql) {
  $res = [];
  foreach(getall($sql) as $row) {
    $res[] = $row[0];
  }
  return $res;
}
 
function getall($sql) {
  $ret = [];
  while($ret[] = mysqli_fetch_row($sql));
  array_pop($ret);
  return $ret;
}

function getdata($sql) {
  $row = mysqli_fetch_assoc($sql);
  if($row) {
    foreach($row as $key => $value) {
      return $value;
    }
  } else {
    return null;
  }
}

function getassoc($opts, $fieldList) {
  $opts = sanitize($opts);
  $fieldList = explode(',', $fieldList);

  $stack = Array();
  foreach($fieldList as $field) {
    $key = trim($field);
    if(array_key_exists($key, $opts)) {
      $stack[$key] = $opts[$key];
    } 
  }
  return $stack;
}

// I'll learn these ORM things eventually ... but
// until then...
function toInsert($assoc) {
  return (
    '(' . implode(', ', array_keys($assoc)) . ')' .
    ' values ' .
    '(\'' . implode(', \'', array_values($assoc)) . '\')'
  );
}

function toUpdate($assoc) {
  $stack = Array();
  foreach($assoc as $key => $value) {
    $stack[] = "$key = '$value'";
  }
  return implode(' and ', $stack);
}

function get($opts, $fieldList) {
  $opts = sanitize($opts);
  $fieldList = explode(',', $fieldList);

  $stack = Array();
  foreach($fieldList as $field) {
    if(array_key_exists(trim($field), $opts)) {
      $stack[] = $opts[trim($field)];
    } else {
      $stack[] = '';
    }
  }
  return $stack;
}

function dolog($str, $res = true, $path = 'sql.log') {
  global $g_uniq;

  if(!is_string($res)) {
    $res = $res ? '1' : '0';
  }
  // it's ok if this fails, I still want valid JSON output
  @file_put_contents(__dir__ . '/../logs/' . $path, 
    implode(' | ', [
      $g_uniq,
      date('c'),
      $res,
      substr($str, 0, 200)
    ]) . "\n", FILE_APPEND);
}

function last_id() {
  return mysqli_insert_id(get_db());
}

function last_run() {
  global $g_rows_affected;
  return $g_rows_affected;
}
function run($mysql_string) {
  global $g_uniq, $g_rows_affected;

  $result = mysqli_query(get_db(), $mysql_string);
  $g_rows_affected = mysqli_affected_rows(get_db());

  dolog($mysql_string . '(' . $g_rows_affected . ')', $result);

  if(!$result) {
    return doError($mysql_string);
  }

  return $result;
}

function run_assoc($mysql_string) {
  $result = run($mysql_string);

  $ret = array();
  while($ret[] = mysqli_fetch_assoc($result));
  array_pop($ret);
  return $ret;
}
