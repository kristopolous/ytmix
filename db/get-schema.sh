#!/bin/sh
. ../secrets/db.ini

if [ -z "$password" ]; then
  mysqldump -h $host -u root --no-data yt > schema  
else 
  mysqldump -h $host -u $user --no-data -p$password yt > schema
fi
