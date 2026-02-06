#!/usr/bin/env python3
"""
Fix oversized images in Claude conversation history
Resizes base64-encoded images to max 2000px while preserving all context
"""

import json
import base64
from io import BytesIO
from PIL import Image
import sys

def resize_base64_image(base64_str, max_size=2000):
    """Resize a base64-encoded image to max dimension while preserving aspect ratio"""
    try:
        # Decode base64 to image
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))

        # Check if resize needed
        width, height = img.size
        max_dim = max(width, height)

        if max_dim <= max_size:
            print(f"  Image already small enough: {width}x{height}")
            return base64_str

        # Calculate new dimensions
        ratio = max_size / max_dim
        new_width = int(width * ratio)
        new_height = int(height * ratio)

        print(f"  Resizing from {width}x{height} to {new_width}x{new_height}")

        # Resize image
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Convert back to base64
        buffered = BytesIO()
        img_resized.save(buffered, format=img.format or "PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        print(f"  Original size: {len(base64_str)} chars")
        print(f"  New size: {len(img_base64)} chars")

        return img_base64
    except Exception as e:
        print(f"  Error resizing image: {e}")
        return base64_str

def fix_conversation_file(input_file, output_file=None):
    """Fix oversized images in a conversation JSONL file"""
    if output_file is None:
        output_file = input_file.replace('.jsonl', '_fixed.jsonl')

    print(f"Reading conversation from: {input_file}")
    print(f"Will write fixed conversation to: {output_file}")

    messages_processed = 0
    images_resized = 0

    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line_num, line in enumerate(infile, 1):
            if not line.strip():
                continue

            try:
                message = json.loads(line)
                messages_processed += 1

                # Check if message has content array with images
                if 'content' in message and isinstance(message['content'], list):
                    for content_item in message['content']:
                        if isinstance(content_item, dict) and content_item.get('type') == 'image':
                            # Found an image
                            image_source = content_item.get('source', {})
                            if 'data' in image_source:
                                print(f"\nMessage {messages_processed} (line {line_num}): Found image")

                                # Resize the image
                                original_data = image_source['data']
                                resized_data = resize_base64_image(original_data)

                                if resized_data != original_data:
                                    image_source['data'] = resized_data
                                    images_resized += 1

                # Write the (possibly modified) message
                outfile.write(json.dumps(message) + '\n')

            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse line {line_num}: {e}")
                outfile.write(line)  # Write original line if can't parse

    print(f"\n✅ Done!")
    print(f"  Processed {messages_processed} messages")
    print(f"  Resized {images_resized} images")
    print(f"\nFixed conversation saved to: {output_file}")
    print(f"\nTo use it:")
    print(f"  1. Backup original: cp {input_file} {input_file}.backup")
    print(f"  2. Replace with fixed: cp {output_file} {input_file}")
    print(f"  3. Open VS Code and your conversation should work!")

if __name__ == "__main__":
    # The conversation file we found
    conversation_file = "/Users/pepijnvanderknaap/.claude/projects/-Users-pepijnvanderknaap-Downloads-Loyal-Locals-main-firebase-loyal-locals-v2/4f53ed4e-e60f-4374-aea0-0c738b374f8e.jsonl"

    try:
        fix_conversation_file(conversation_file)
    except FileNotFoundError:
        print(f"Error: Could not find conversation file: {conversation_file}")
        print("Make sure the file exists")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
