import os

# Excluded dirs and files (relative names)
EXCLUDED_DIRS = {
    '.git', 'AI AGENT/__pycache__', 'AI AGENT/KMS',
    'PLAYGROUND/.github', 'PLAYGROUND/.next',
    'PLAYGROUND/src', 'PLAYGROUND/node_modules'
}
EXCLUDED_FILES = {'tree.py'}

def is_excluded(path):
    # Normalize path for matching
    normalized = os.path.normpath(path)
    for excluded in EXCLUDED_DIRS:
        if normalized.endswith(os.path.normpath(excluded)):
            return True
    return os.path.basename(path) in EXCLUDED_FILES

def print_tree(start_path='.', prefix=''):
    entries = sorted(
        [e for e in os.listdir(start_path) if not e.startswith('.')]
    )
    entries_count = len(entries)

    for i, entry in enumerate(entries):
        path = os.path.join(start_path, entry)
        if is_excluded(path):
            continue  # Skip excluded dirs/files entirely

        connector = '├── ' if i < entries_count - 1 else '└── '
        print(prefix + connector + entry)

        if os.path.isdir(path) and not is_excluded(path):
            extension = '│   ' if i < entries_count - 1 else '    '
            print_tree(path, prefix + extension)

if __name__ == '__main__':
    print_tree()
