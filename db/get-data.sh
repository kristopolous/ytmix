echo "Dumping"
mysqldump -u root yt > mysql-dump.db
echo "Compressing"
[ -e mysql-dump.db.lzma ] && rm mysql-dump.db.lzma
lzma -9 mysql-dump.db
