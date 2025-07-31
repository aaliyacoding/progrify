import os

EXCLUDED_DIRS = {'__pycache__', 'logs', 'KMS'}
EXCLUDED_FILES = {'tree.py', 'README.md'}
INCLUDED_EXTENSIONS = {'.py', '.html'}
INCLUDED_FILENAMES = {'requirements.txt'}

def should_include(file):
    if file in EXCLUDED_FILES:
        return False
    ext = os.path.splitext(file)[1]
    return ext in INCLUDED_EXTENSIONS or file in INCLUDED_FILENAMES

def print_file_content(filepath, rel_path):
    print(f"\n=== {rel_path} ===\n")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            print(f.read())
    except Exception as e:
        print(f"[Error reading {rel_path}]: {e}")

def scan_and_show(start_path='.'):
    for root, dirs, files in os.walk(start_path):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in files:
            if should_include(file):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, start_path)
                print_file_content(full_path, rel_path)

if __name__ == '__main__':
    scan_and_show()
