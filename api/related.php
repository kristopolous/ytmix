<?php

$related_videos = Array();
$ytid = $_GET['ytid'];
$source = 'https://gdata.youtube.com/feeds/api/videos/' . $ytid .'/related?v=2';
@$raw_data = file_get_contents($source);
$xml = simplexml_load_string($raw_data);

foreach($xml->entry as $row) {
  $pieces = explode(':', $row->id);
  $related_videos[] = Array(
    'ytid' => array_pop($pieces),
    'title' => strval($row->title)
  ); 
}

echo json_encode(Array(
  'ytid' => $ytid,
  'related' => $related_videos
));
