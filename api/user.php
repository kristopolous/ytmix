<?php

function pl_setFavorite($params) {
  return run("insert into favorite " . toInsert(getAssoc($params, 'user, ytid')));
}

function pl_getFavorite($params) {
  return run("select * from favorite where " . toUpdate(getAssoc($params, 'user')));
}

function pl_delFavorite($params) {
  return run("delete from favorite where " . toUpdate(getAssoc($params, 'user, ytid')));
}

function pl_getUser($params) {
  list($id) = get($params, 'id');

  if($id) {
    $result = run("select * from playlist where name='$id'");
    $data = mysqli_fetch_assoc($result);
    if($data) {
      return toJson($data, ['tracklist', 'preview', 'blacklist']);
    } 

    return [];
  } 

  return uniqid('', true);
}

