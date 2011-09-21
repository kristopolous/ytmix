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

function get($opts, $fieldList) {
  $opts = sanitize($opts);
  $fieldList = explode(',', $fieldList);

  $stack = Array();
  foreach($fieldList as $field) {
    $stack[] = $opts[trim($field)];
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
