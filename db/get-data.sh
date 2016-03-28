#!/bin/sh
. ../secrets/db.ini

echo "Dumping"
if [ -z "$password" ]; then
  mysqldump -u $user yt > mysql-dump.db
else 
  mysqldump -u $user -p$password yt > mysql-dump.db
fi

echo "Compressing"
[ -e mysql-dump.db.lzma ] && rm mysql-dump.db.lzma
lzma -9 mysql-dump.db
