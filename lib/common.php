<?
include ('db.php');

function result($succeed, $message) {
  echo json_encode(
    Array(
      'status' => $succeed,
      'result' => $message
    )
  );
  exit(0);
}

function sanitize($opts) {
  foreach ($opts as $k => $v) {
    $opts[$k] = mysql_real_escape_string($v);
  }
  return $opts;
}

function getdata($sql) {
  $row = mysql_fetch_assoc($sql);
  foreach($row as $key => $value) {
    return $value;
  }
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
