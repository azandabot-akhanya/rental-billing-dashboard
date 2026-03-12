#!/usr/bin/env python3
"""
Emergency SFTP Deployment for ThynkxPro
"""
import paramiko
import os
import sys
from pathlib import Path
from stat import S_ISDIR

# Server configuration
HOST = "197.242.150.197"
USER = "admin@thynkxpro-dpl.co.za"
PASSWORD = "Wesley123@123"
PORT = 22

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_status(message, status='info'):
    colors = {'info': BLUE, 'success': GREEN, 'error': RED, 'warning': YELLOW}
    color = colors.get(status, RESET)
    symbol = '✓' if status == 'success' else '→' if status == 'info' else '✗'
    print(f"{color}{symbol} {message}{RESET}")

def connect_sftp():
    """Connect via SFTP"""
    print_status("Connecting via SFTP...", 'info')
    try:
        transport = paramiko.Transport((HOST, PORT))
        transport.connect(username=USER, password=PASSWORD)
        sftp = paramiko.SFTPClient.from_transport(transport)
        print_status(f"Connected to {HOST}", 'success')
        return sftp, transport
    except Exception as e:
        print_status(f"SFTP failed: {e}", 'error')
        return None, None

def mkdir_p(sftp, remote_directory):
    """Create directory recursively"""
    if remote_directory == '/':
        sftp.chdir('/')
        return
    if remote_directory == '':
        return
    try:
        sftp.chdir(remote_directory)
    except IOError:
        dirname, basename = os.path.split(remote_directory.rstrip('/'))
        mkdir_p(sftp, dirname)
        sftp.mkdir(basename)
        sftp.chdir(basename)

def upload_file(sftp, local_path, remote_path):
    """Upload single file"""
    try:
        sftp.put(local_path, remote_path)
        return True
    except Exception as e:
        print_status(f"Error: {e}", 'error')
        return False

def upload_directory(sftp, local_dir, remote_dir):
    """Upload directory recursively"""
    for item in os.listdir(local_dir):
        if item.startswith('.'):
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = os.path.join(remote_dir, item).replace('\\', '/')

        if os.path.isfile(local_path):
            print_status(f"  {item}", 'info')
            upload_file(sftp, local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                mkdir_p(sftp, remote_path)
            except:
                pass
            upload_directory(sftp, local_path, remote_path)

def main():
    print(f"\n{BLUE}{'='*50}")
    print(f"   ThynkxPro SFTP Deployment")
    print(f"{'='*50}{RESET}\n")

    project_dir = Path(__file__).parent
    os.chdir(project_dir)

    sftp, transport = connect_sftp()
    if not sftp:
        print_status("Trying direct SSH commands instead...", 'warning')
        # We'll create an rsync/scp approach
        return

    try:
        # Find root directory
        try:
            sftp.chdir('/public_html')
            root_dir = '/public_html'
        except:
            sftp.chdir('/')
            root_dir = '/'

        print_status(f"Root directory: {root_dir}", 'success')

        # Create directories
        print(f"\n{YELLOW}Creating directories{RESET}")
        for dir_path in ['api', 'uploads', 'uploads/tenant-documents']:
            try:
                full_path = f"{root_dir}/{dir_path}".replace('//', '/')
                mkdir_p(sftp, full_path)
                print_status(f"  {dir_path}", 'success')
            except Exception as e:
                print_status(f"  {dir_path}: {e}", 'warning')

        # Upload API files
        print(f"\n{YELLOW}Uploading PHP API files{RESET}")
        api_dir = project_dir / 'app' / 'api'
        for php_file in api_dir.glob('*.php'):
            remote_file = f"{root_dir}/api/{php_file.name}".replace('//', '/')
            print_status(f"  {php_file.name}", 'info')
            upload_file(sftp, str(php_file), remote_file)

        # Upload static files
        print(f"\n{YELLOW}Uploading static files{RESET}")
        out_dir = project_dir / 'out'
        if out_dir.exists():
            for item in out_dir.iterdir():
                if item.name.startswith('.'):
                    continue

                remote_path = f"{root_dir}/{item.name}".replace('//', '/')
                if item.is_file():
                    print_status(f"  {item.name}", 'info')
                    upload_file(sftp, str(item), remote_path)
                elif item.is_dir():
                    print_status(f"  DIR: {item.name}", 'info')
                    mkdir_p(sftp, remote_path)
                    upload_directory(sftp, str(item), remote_path)

        # Upload .htaccess
        print(f"\n{YELLOW}Uploading .htaccess{RESET}")
        htaccess = project_dir / '.htaccess.production'
        if htaccess.exists():
            upload_file(sftp, str(htaccess), f"{root_dir}/.htaccess".replace('//', '/'))
            print_status(".htaccess uploaded", 'success')

        # Set permissions
        print(f"\n{YELLOW}Setting permissions{RESET}")
        try:
            sftp.chmod(f"{root_dir}/uploads".replace('//', '/'), 0o775)
            sftp.chmod(f"{root_dir}/uploads/tenant-documents".replace('//', '/'), 0o775)
            print_status("Permissions set", 'success')
        except Exception as e:
            print_status(f"Permission error: {e}", 'warning')

        print(f"\n{GREEN}Deployment complete!{RESET}\n")

    finally:
        sftp.close()
        transport.close()

    print(f"{BLUE}Test these URLs:{RESET}")
    print(f"1. http://thynkxpro-dpl.co.za")
    print(f"2. http://thynkxpro-dpl.co.za/api/companies?company_id=1\n")

if __name__ == "__main__":
    # Check if paramiko is installed
    try:
        import paramiko
    except ImportError:
        print(f"{RED}Installing paramiko...{RESET}")
        os.system("pip3 install paramiko")
        import paramiko
    main()
