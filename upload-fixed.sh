#!/bin/bash
# Upload with correct credentials from server.md

echo "🚀 Uploading ALL fixed files to production server..."

# Create temporary upload directory
mkdir -p /tmp/thynkxpro-upload
cp -r out/* /tmp/thynkxpro-upload/

# Use lftp with CORRECT password
lftp -u "admin@thynkxpro-dpl.co.za","Wesley@123@123" "ftp://197.242.150.197" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
lcd /tmp/thynkxpro-upload
cd /
mirror -R --verbose=1 --exclude-glob=api --exclude-glob=uploads .
bye
EOF

if [ $? -eq 0 ]; then
    echo "✅ Upload complete!"
else
    echo "❌ Upload failed!"
fi

# Cleanup
rm -rf /tmp/thynkxpro-upload
