<?
$related_videos = Array();
$ytID = $_GET['ytid'];
$main_doc = new DOMDocument();
$main_doc->preserveWhiteSpace = FALSE;
@$raw_data = file_get_contents("http://m.youtube.com/results?client=mv-google&gl=US&hl=en&search=related&q=&ps=20&v=$ytID");
@$main_doc->loadHTML($raw_data);
$nodelist = $main_doc->getElementsByTagName("title");

foreach ($nodelist as $node) {
  $title = $node->nodeValue;
  $title = explode('-', $title);
  array_pop($title);
  $title = implode('-', $title);
  break;
}

$length = preg_match('/ "length_seconds": (\d+)/', $raw_data, $matches);
$nodelist = $main_doc->getElementsByTagName("a");
foreach ($nodelist as $node) {

  $link = $node->getAttribute('href');
  if(strpos($link, 'watch') !== false) {

    // dump playlists
    if(
        strpos($link, 'list_related') == false
        &&  strpos($link, 'rellist') == false
      ) {
      
      $time = preg_split('/\s/', preg_replace('/^([0-9:]*).*/', '$1', $node->parentNode->nextSibling->nextSibling->nodeValue));
      $time = $time[0];
      list( $minutes, $seconds ) = explode(':', $time);
      $length = intval($minutes) * 60 + intval($seconds);

      $related_videos[] = Array(
        'length' => $length,
        'title' => trim($node->nodeValue),
        'ytid' => preg_replace('/^.*v=([^&]*).*/', '$1', $link)
      );

    } 
  }
}

echo json_encode(Array(
  'ytid' => $ytID,
  'related' => $related_videos
));

?>
