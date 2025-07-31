import os

def print_tree(start_path='.', prefix=''):
    entries = sorted(os.listdir(start_path))
    entries = [e for e in entries if not e.startswith('.')]  # Skip hidden files/folders
    entries_count = len(entries)

    for i, entry in enumerate(entries):
        path = os.path.join(start_path, entry)
        connector = '├── ' if i < entries_count - 1 else '└── '
        print(prefix + connector + entry)

        if os.path.isdir(path):
            extension = '│   ' if i < entries_count - 1 else '    '
            print_tree(path, prefix + extension)

if __name__ == '__main__':
    print_tree()
