#!/bin/sh
# Export the database (schema + data) to Database/chatgpt_clone.sql, for submission.
cd "$(dirname "$0")"
docker exec chatgpt-mysql mysqldump -uroot -proot --databases chatgpt_clone --routines --triggers > chatgpt_clone.sql
echo "Wrote $(pwd)/chatgpt_clone.sql"
