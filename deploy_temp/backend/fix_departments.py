import re

# Read the file
with open('app/initial_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace to add init_departments before init_faculties
old_pattern = r'(# 5\. Initialiser les facultes.*?)\s+logger\.info\("Initializing faculties\.\.\."\)\s+faculties = init_faculties\(session\)'

new_code = r'''\1
        
        logger.info("Initializing departments...")
        departments = init_departments(session)
        
        logger.info("Initializing faculties...")
        faculties = init_faculties(departments)'''

# Perform the replacement
content_new = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Check if replacement was made
if content != content_new:
    # Write back
    with open('app/initial_data.py', 'w', encoding='utf-8') as f:
        f.write(content_new)
    print("Successfully added init_departments call")
else:
    print("Pattern not found - trying to find what's there")
    match = re.search(r'# 5\. Initialiser.*?faculties = init_faculties', content, re.DOTALL)
    if match:
        print("Found:")
        print(match.group(0))
