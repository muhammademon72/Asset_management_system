#!/usr/bin/env python3
"""
Update file size validation from 1MB to 5MB for all attachment inputs.
Attachments are now stored in a separate table, so each file can be up to 5MB.
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# Update validation calls from 1048576 (1MB) to 5242880 (5MB)
old = 'validateAttachmentSize(this, 1048576)'
new = 'validateAttachmentSize(this, 5242880)'

count = src.count(old)
src = src.replace(old, new)
print(f'Updated {count} validation calls from 1MB to 5MB')

# Update hint text
old2 = 'Max file size: 1 MB. Allowed: images, PDF, Word, Excel, TXT.'
new2 = 'Max file size: 5 MB. Allowed: images, PDF, Word, Excel, TXT.'

count2 = src.count(old2)
src = src.replace(old2, new2)
print(f'Updated {count2} hint texts from 1MB to 5MB')

# Update error messages in saveDBNow
old3 = 'max 1 MB'
new3 = 'max 5 MB'

count3 = src.count(old3)
src = src.replace(old3, new3)
print(f'Updated {count3} error messages from 1MB to 5MB')

PATH.write_text(src, encoding='utf-8')
print('✅ All file size limits updated to 5MB.')
