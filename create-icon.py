#!/usr/bin/env python3
from PIL import Image

# Create a simple 512x512 icon with a gradient
img = Image.new('RGBA', (512, 512), (100, 100, 255, 255))

# Save in different sizes
img.save('src-tauri/icons/icon.png')
img.resize((32, 32)).save('src-tauri/icons/32x32.png')
img.resize((128, 128)).save('src-tauri/icons/128x128.png')
img.resize((256, 256)).save('src-tauri/icons/128x128@2x.png')

print("Icons created successfully!")
