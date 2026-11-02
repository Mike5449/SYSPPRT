
import sys

def strip_non_ascii(file_path):
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Decode as utf-8, ignore errors or replace?
    # We want to keep ASCII.
    # Approach: Decode utf-8, then encode ascii with 'ignore'
    
    text = content.decode('utf-8', errors='ignore')
    ascii_text = text.encode('ascii', errors='ignore').decode('ascii')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(ascii_text)
    print(f"Stripped non-ascii from {file_path}")

if __name__ == "__main__":
    for f in ['app/initial_data.py', 'app/complete_init.py', 'app/initial_data_simple.py', 'app/core/db.py']:
        try:
            strip_non_ascii(f)
        except Exception as e:
            print(f"Failed to strip {f}: {e}")
