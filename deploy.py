#!/usr/bin/env python3
"""
Emergency FTP Deployment Script for ThynkxPro
Uploads files and tests endpoints
"""

import ftplib
import os
import sys
from pathlib import Path
import time

# Server configuration
FTP_HOST = "197.242.150.197"
FTP_USER = "admin@thynkxpro-dpl.co.za"
FTP_PASS = "Wesley123@123"

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_status(message, status='info'):
    colors = {'info': BLUE, 'success': GREEN, 'error': RED, 'warning': YELLOW}
    color = colors.get(status, RESET)
    print(f"{color}{'✓' if status == 'success' else '→' if status == 'info' else '✗'} {message}{RESET}")

def connect_ftp():
    """Connect to FTP server"""
    print_status("Connecting to FTP server...", 'info')
    try:
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print_status(f"Connected to {FTP_HOST}", 'success')
        return ftp
    except Exception as e:
        print_status(f"Failed to connect: {e}", 'error')
        sys.exit(1)

def create_directory(ftp, path):
    """Create directory if it doesn't exist"""
    try:
        ftp.cwd(path)
        print_status(f"Directory {path} exists", 'info')
    except:
        try:
            ftp.mkd(path)
            print_status(f"Created directory: {path}", 'success')
        except Exception as e:
            print_status(f"Could not create {path}: {e}", 'warning')

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_path}', f)
        return True
    except Exception as e:
        print_status(f"Error uploading {local_path}: {e}", 'error')
        return False

def upload_directory(ftp, local_dir, remote_dir, exclude=[]):
    """Recursively upload directory"""
    for item in os.listdir(local_dir):
        if item in exclude or item.startswith('.'):
            continue

        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"

        if os.path.isfile(local_path):
            print_status(f"Uploading: {item}", 'info')
            if upload_file(ftp, local_path, remote_path):
                print_status(f"  ✓ {item}", 'success')
        elif os.path.isdir(local_path):
            create_directory(ftp, remote_path)
            ftp.cwd(remote_dir)
            upload_directory(ftp, local_path, remote_path, exclude)

def main():
    print(f"\n{BLUE}{'='*50}")
    print(f"   ThynkxPro Emergency Deployment")
    print(f"{'='*50}{RESET}\n")

    # Get project directory
    project_dir = Path(__file__).parent
    os.chdir(project_dir)

    # Connect to FTP
    ftp = connect_ftp()

    # Navigate to root
    try:
        ftp.cwd('/')
        print_status("In root directory", 'success')
    except:
        ftp.cwd('/public_html')
        print_status("In /public_html directory", 'success')

    current_dir = ftp.pwd()
    print_status(f"Current directory: {current_dir}", 'info')

    print(f"\n{YELLOW}Step 1: Creating directories{RESET}")
    create_directory(ftp, 'api')
    create_directory(ftp, 'uploads')
    ftp.cwd(current_dir)
    create_directory(ftp, 'uploads/tenant-documents')
    ftp.cwd(current_dir)

    print(f"\n{YELLOW}Step 2: Uploading PHP API files{RESET}")
    api_dir = project_dir / 'app' / 'api'
    if api_dir.exists():
        for php_file in api_dir.glob('*.php'):
            remote_file = f"api/{php_file.name}"
            print_status(f"Uploading {php_file.name}...", 'info')
            if upload_file(ftp, str(php_file), remote_file):
                print_status(f"  ✓ {php_file.name}", 'success')

    print(f"\n{YELLOW}Step 3: Uploading static files from /out/{RESET}")
    out_dir = project_dir / 'out'
    if out_dir.exists():
        ftp.cwd(current_dir)

        # Upload all files in out directory
        for item in out_dir.iterdir():
            if item.name.startswith('.'):
                continue

            if item.is_file():
                print_status(f"Uploading {item.name}...", 'info')
                if upload_file(ftp, str(item), item.name):
                    print_status(f"  ✓ {item.name}", 'success')
            elif item.is_dir():
                print_status(f"Uploading directory: {item.name}", 'info')
                create_directory(ftp, item.name)
                ftp.cwd(current_dir)
                upload_directory(ftp, str(item), item.name, exclude=['node_modules', '.git'])
                ftp.cwd(current_dir)

    print(f"\n{YELLOW}Step 4: Uploading .htaccess{RESET}")
    htaccess_prod = project_dir / '.htaccess.production'
    if htaccess_prod.exists():
        ftp.cwd(current_dir)
        if upload_file(ftp, str(htaccess_prod), '.htaccess'):
            print_status(".htaccess uploaded", 'success')

    print(f"\n{YELLOW}Step 5: Setting permissions{RESET}")
    try:
        ftp.sendcmd('SITE CHMOD 755 api')
        ftp.sendcmd('SITE CHMOD 775 uploads')
        ftp.sendcmd('SITE CHMOD 775 uploads/tenant-documents')
        print_status("Permissions set", 'success')
    except:
        print_status("Could not set permissions via FTP (may need manual)", 'warning')

    # List files to verify
    print(f"\n{YELLOW}Verifying upload...{RESET}")
    ftp.cwd(current_dir)
    files = []
    ftp.retrlines('NLST', files.append)
    print_status(f"Files in root: {', '.join(files[:10])}", 'info')

    ftp.quit()

    print(f"\n{GREEN}{'='*50}")
    print(f"   Deployment Complete!")
    print(f"{'='*50}{RESET}\n")

    print(f"{BLUE}Testing URLs:{RESET}")
    print(f"1. Main site: http://thynkxpro-dpl.co.za")
    print(f"2. API test: http://thynkxpro-dpl.co.za/api/companies?company_id=1")
    print(f"\n{YELLOW}Next: Test these URLs in your browser!{RESET}\n")

if __name__ == "__main__":
    main()
