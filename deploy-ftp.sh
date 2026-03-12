#!/bin/bash

# ===================================
# ThynkxPro FTP Deployment Script
# ===================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
FTP_HOST="197.242.150.197"
FTP_USER="admin@thynkxpro-dpl.co.za"
FTP_PASS="Wesley123@123"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ThynkxPro Deployment Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if lftp is installed
if ! command -v lftp &> /dev/null; then
    echo -e "${RED}✗ lftp is not installed${NC}"
    echo -e "${YELLOW}Installing lftp...${NC}"
    brew install lftp
fi

# Function to upload directory via FTP
upload_ftp() {
    local LOCAL_PATH=$1
    local REMOTE_PATH=$2
    local DESCRIPTION=$3

    echo -e "${YELLOW}→ Uploading ${DESCRIPTION}...${NC}"

    lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
mirror -R --verbose=1 --exclude-glob=.git* --exclude-glob=node_modules --exclude-glob=.next "$LOCAL_PATH" "$REMOTE_PATH"
bye
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${DESCRIPTION} uploaded successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to upload ${DESCRIPTION}${NC}"
        return 1
    fi
}

# Function to create remote directory
create_remote_dir() {
    local REMOTE_PATH=$1

    echo -e "${YELLOW}→ Creating directory ${REMOTE_PATH}...${NC}"

    lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
mkdir -p "$REMOTE_PATH"
bye
EOF
}

# Function to upload single file
upload_file() {
    local LOCAL_FILE=$1
    local REMOTE_PATH=$2
    local DESCRIPTION=$3

    echo -e "${YELLOW}→ Uploading ${DESCRIPTION}...${NC}"

    lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
put "$LOCAL_FILE" -o "$REMOTE_PATH"
bye
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${DESCRIPTION} uploaded successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to upload ${DESCRIPTION}${NC}"
        return 1
    fi
}

# Start deployment
echo -e "${BLUE}Starting deployment to ${FTP_HOST}...${NC}"
echo ""

# Step 1: Build the application (if not already built)
if [ ! -d "out" ]; then
    echo -e "${YELLOW}Building Next.js application...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Build failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Build completed${NC}"
    echo ""
fi

# Step 2: Create necessary directories on server
echo -e "${BLUE}Step 1: Creating server directories...${NC}"
create_remote_dir "api"
create_remote_dir "uploads"
create_remote_dir "uploads/tenant-documents"
echo ""

# Step 3: Upload PHP API files
echo -e "${BLUE}Step 2: Uploading PHP API files...${NC}"

# Upload each PHP file individually to ensure they go to /api/
for file in app/api/*.php; do
    filename=$(basename "$file")
    upload_file "$file" "api/$filename" "API: $filename"
done
echo ""

# Step 4: Upload static files from out directory
echo -e "${BLUE}Step 3: Uploading static files...${NC}"
upload_ftp "out" "/" "Static website files"
echo ""

# Step 5: Upload .htaccess if exists
if [ -f ".htaccess.production" ]; then
    echo -e "${BLUE}Step 4: Uploading .htaccess...${NC}"
    upload_file ".htaccess.production" ".htaccess" ".htaccess file"
    echo ""
fi

# Step 6: Set permissions (if supported)
echo -e "${BLUE}Step 5: Setting permissions...${NC}"
lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow no
chmod 755 api
chmod 775 uploads
chmod 775 uploads/tenant-documents
bye
EOF
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

# Deployment complete
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Complete!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Create ${YELLOW}api/db.php${NC} with your database credentials"
echo -e "2. Import database schema via phpMyAdmin"
echo -e "3. Test your site at ${YELLOW}http://thynkxpro-dpl.co.za${NC}"
echo ""
echo -e "${BLUE}Database file needed:${NC}"
echo -e "  - ${YELLOW}database-setup.sql${NC}"
echo -e "  - ${YELLOW}calendar-migration.sql${NC}"
echo ""
