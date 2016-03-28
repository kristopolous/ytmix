#!/bin/sh
. ../secrets/db.ini

if [ -z "$password" ]; then
  mysqldump -u root --no-data yt > schema  
else 
  mysqldump -u $user --no-data -p$password yt > schema
fi
