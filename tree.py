import os

EXCLUDED_DIRS = {
    '.git', 'AI AGENT/__pycache__', 'AI AGENT/KMS',
    'PLAYGROUND/.github', 'PLAYGROUND/.next',
    'PLAYGROUND/src', 'PLAYGROUND/node_modules'
}

EXCLUDED_FILES = {
    'tree.py',
    'PLAYGROUND/public/favicon.ico',
    'PLAYGROUND/public/logo.svg',
    'PLAYGROUND/.gitignore'
}

def is_excluded(path):
    normalized = os.path.normpath(path)
    for excluded_dir in EXCLUDED_DIRS:
        ed = os.path.normpath(excluded_dir)
        if normalized == ed or normalized.startswith(ed + os.sep):
            return True
    rel_path = os.path.relpath(normalized, '.')
    if rel_path in {os.path.normpath(f) for f in EXCLUDED_FILES}:
        return True
    return False

def is_binary(path):
    try:
        with open(path, 'rb') as f:
            chunk = f.read(1024)
        return b'\0' in chunk  # crude binary check
    except:
        return True

def print_tree(start_path='.', prefix='', show_code=False):
    entries = sorted(os.listdir(start_path))
    entries_count = len(entries)

    for i, entry in enumerate(entries):
        path = os.path.join(start_path, entry)
        if is_excluded(path):
            continue

        connector = '├── ' if i < entries_count - 1 else '└── '
        print(prefix + connector + entry)

        if os.path.isdir(path):
            extension = '│   ' if i < entries_count - 1 else '    '
            print_tree(path, prefix + extension, show_code)
        else:
            if show_code and not is_binary(path):
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line in f:
                            print(prefix + '    ' + line.rstrip())
                except Exception as e:
                    print(prefix + '    ' + f"[Could not read file: {e}]")

if __name__ == '__main__':
    print_tree('.', show_code=True)
