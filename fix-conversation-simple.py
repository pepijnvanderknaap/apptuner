#!/usr/bin/env python3
"""
Remove oversized images from Claude conversation
"""

import json

input_file = "/Users/pepijnvanderknaap/.claude/projects/-Users-pepijnvanderknaap-Downloads-Loyal-Locals-main-firebase-loyal-locals-v2/4f53ed4e-e60f-4374-aea0-0c738b374f8e.jsonl"
output_file = input_file.replace('.jsonl', '_fixed.jsonl')

print(f"Reading from: {input_file}")
print(f"Writing to: {output_file}\n")

messages_processed = 0
images_removed = 0

with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
    for line_num, line in enumerate(infile, 1):
        if not line.strip():
            continue

        try:
            message = json.loads(line)
            messages_processed += 1

            # Check if message has content array with images
            if 'message' in message and 'content' in message['message']:
                content = message['message']['content']
                if isinstance(content, list):
                    new_content = []
                    for item in content:
                        if isinstance(item, dict) and item.get('type') == 'image':
                            # Remove this image, replace with text
                            print(f"Line {line_num}: Removing oversized image, replacing with text")
                            new_content.append({
                                "type": "text",
                                "text": "[Image removed - was too large for API]"
                            })
                            images_removed += 1
                        else:
                            new_content.append(item)

                    message['message']['content'] = new_content

            # Write the (possibly modified) message
            outfile.write(json.dumps(message) + '\n')

        except Exception as e:
            print(f"Warning: Error on line {line_num}: {e}")
            outfile.write(line)

print(f"\n✅ Done!")
print(f"  Processed {messages_processed} messages")
print(f"  Removed {images_removed} images")
print(f"\nFixed conversation saved to: {output_file}")
