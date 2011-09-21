#!/usr/bin/env bash

wget="wget --quiet --no-check-certificate"

rawURLList="swfobject.js http://swfobject.googlecode.com/svn/trunk/swfobject/src/swfobject.js db.js https://github.com/kristopolous/db.js/raw/master/db.js _inject.js https://github.com/kristopolous/_inject/raw/master/_inject.js jquery-1.6.4.js http://code.jquery.com/jquery-1.6.4.js underscore.js https://raw.github.com/documentcloud/underscore/master/underscore.js jstorage.js https://raw.github.com/andris9/jStorage/master/jstorage.js evda.js https://raw.github.com/kristopolous/EvDa/master/evda.js jquery.mousewheel.js https://raw.github.com/brandonaaron/jquery-mousewheel/master/jquery.mousewheel.js"

minURLList="swfobject.js http://swfobject.googlecode.com/svn/trunk/swfobject/swfobject.js db.js https://github.com/kristopolous/db.js/raw/master/db.min.js _inject.js https://github.com/kristopolous/_inject/raw/master/_inject.min.js jquery-1.6.4.js http://code.jquery.com/jquery-1.6.4.min.js underscore.js https://raw.github.com/documentcloud/underscore/master/underscore-min.js jstorage.js https://raw.github.com/andris9/jStorage/master/jstorage.min.js evda.js https://raw.github.com/kristopolous/EvDa/master/evda.min.js jquery.mousewheel.js http://qaa.ath.cx/jquery.mousewheel.min.js"

info() {
  echo " [ Info ] ${1}"
}

DIR=""
download() {
  fileList=""
  [ -d $DIR ] || mkdir $DIR

  while [ $# -gt 0 ]; do
    file=$1

    if [ ! -e $DIR/$file ]; then 
      info "Getting $2 > $DIR/$file"
      $wget $2 -O $DIR/$file
      echo "<script src=js/$DIR/$file></script>" >> .tmpfile
    fi

    shift; shift;
  done

  cat .tmpfile
  rm .tmpfile
}
  
(
  cd ../js
  DIR=raw
  download $rawURLList
)

(
  cd ../js
  DIR=min
  download $minURLList
)

