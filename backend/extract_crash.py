with open("crash.log", "rb") as f:
    content = f.read()
    
# Try to decode and get last part
try:
    text = content.decode('utf-8', errors='replace')
except:
    text = content.decode('latin-1', errors='replace')

# Get last 2000 characters
tail = text[-2000:]
print(tail)

# Also save to a simple text file
with open("crash_tail.txt", "w", encoding="utf-8", errors='replace') as f:
    f.write(tail)
print("\n\nSaved to crash_tail.txt")
