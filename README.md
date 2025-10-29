📖 About

This is a Multimedia Forensics Mini Project that demonstrates image steganography using the LSB technique. Steganography is the practice of concealing secret messages within images without visible changes.

✨ Features

🔒 Message Embedding: Hide secret messages within images
🔍 Message Extraction: Extract hidden messages from stego images
🎨 Image Preview: Real-time preview of uploaded images
📊 Capacity Calculation: Automatic calculation of maximum message capacity
📱 Responsive Design: Works on desktop and mobile devices
⚡ Client-Side Processing: All processing happens in the browser - no data sent to servers
🛠️ How to Use

Embedding a Message

Select "Embed Message" mode
Upload a cover image (PNG or JPG)
Enter your secret message
Click "Embed Message"
Download the stego image
Extracting a Message

Select "Extract Message" mode
Upload the stego image
Click "Extract Message"
View the extracted message
🔬 How It Works

The application uses LSB (Least Significant Bit) Steganography:

Converts your message to binary
Replaces the least significant bits of pixel RGB values
Changes are invisible to human eyes (±1 color value change)
Uses end markers to identify message boundaries
