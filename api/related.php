<?
$related_videos = Array();
$ytID = $_GET['ytid'];
$main_doc = new DOMDocument();
$main_doc->preserveWhiteSpace = FALSE;
@$raw_data = file_get_contents("http://www.youtube.com/watch?v=$ytID");
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

	if($node->hasAttribute("class") && (trim($node->getAttribute('class')) == 'video-list-item-link')) {
		$link = $node->getAttribute('href');

		if(strpos($link, 'watch?') && strpos($link, 'list_related') == false) {
			
      list( $minutes, $seconds ) = explode(':', $node->childNodes->item(0)->childNodes->item(1)->textContent);
      
      $length = intval($minutes) * 60 + intval($seconds);

			$related_videos[] = Array(
        'length' => $length,
				'title' => $node->childNodes->item(1)->getAttribute('title'),
				'ytid' => preg_replace('/^.*v=([^&]*).*/', '$1', $link)
			);

    } 
	}
}

echo json_encode(Array(
  'length' => intval($matches[1]),
	'ytid' => $ytID,
	'title' => trim(preg_replace('/\s+/', ' ', $title)),
	'related' => $related_videos
));

?>
