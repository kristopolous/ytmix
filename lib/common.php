<?php
include ('db.php');

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

function result($succeed, $message, $extra = false) {
  if(!$extra) {
    echo json_encode(
      Array(
        'status' => $succeed,
        'result' => $message
      )
    );
  } else {
    echo json_encode(
      Array(
        'status' => $succeed,
        'result' => $message,
        'message' => $extra
      )
    );
  }
  exit(0);
}

function sanitize($opts) {
  foreach ($opts as $k => $v) {
    if(gettype($v) == 'string') {
      $opts[$k] = mysql_real_escape_string($v);
    }
  }
  return $opts;
}

function toJson(&$data, $decode = Array()) {
  foreach($decode as $field) {
    if(gettype($field) == 'array') {
      foreach($data as &$child) {
        toJson($child, $field);
      }
    } else {
      $data[$field] = json_decode($data[$field], true);
    }
  }
  return $data;
}

function getdata($sql) {
  $row = mysql_fetch_assoc($sql);
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

function run($mysql_string) {
  $result = mysql_query($mysql_string);
  if(!$result) {
    result(false, "Unable to get playlist");
  }
  return $result;
}

function run_assoc($mysql_string) {
  $result = run($mysql_string);

  $ret = array();
  while($ret[] = mysql_fetch_assoc($result));
  array_pop($ret);
  return $ret;
}
