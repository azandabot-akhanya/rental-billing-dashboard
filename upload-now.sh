#!/bin/bash
# EMERGENCY UPLOAD - Run this NOW

echo "🚀 Uploading fixed files to server..."

# Create temporary upload directory
mkdir -p /tmp/thynkxpro-upload
cp -r out/* /tmp/thynkxpro-upload/

# Use lftp if available
if command -v lftp &> /dev/null; then
    lftp -u "admin@thynkxpro-dpl.co.za","Wesley123@123" "ftp://197.242.150.197" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
lcd /tmp/thynkxpro-upload
cd /
mirror -R --verbose=1 --exclude-glob=api --exclude-glob=uploads .
bye
EOF
    echo "✅ Upload complete!"
else
    echo "❌ lftp not installed. Use FileZilla:"
    echo "1. Upload ALL files from: out/"
    echo "2. To server: /"
    echo "3. Overwrite existing files"
fi

# Cleanup
rm -rf /tmp/thynkxpro-upload
