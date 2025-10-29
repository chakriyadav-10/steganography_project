class SteganographyLSB {
    constructor() {
        this.endMarker = '###END###'; // Unique end marker
    }

    // Convert string to binary
    stringToBinary(str) {
        return str.split('').map(char => {
            return char.charCodeAt(0).toString(2).padStart(8, '0');
        }).join('');
    }

    // Convert binary to string
    binaryToString(binary) {
        let text = '';
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.substr(i, 8);
            if (byte.length === 8) {
                text += String.fromCharCode(parseInt(byte, 2));
            }
        }
        return text;
    }

    // Embed message using LSB technique
    embedMessage(imageData, message) {
        // Create a copy of image data
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        const data = newData.data;
        
        // Add end marker to message
        const fullMessage = message + this.endMarker;
        const binaryMessage = this.stringToBinary(fullMessage);
        
        let msgIndex = 0;
        const dataLength = data.length;

        // Embed message in RGB channels (skip alpha)
        for (let i = 0; i < dataLength; i += 4) {
            // Use all three color channels (RGB)
            for (let channel = 0; channel < 3; channel++) {
                if (msgIndex < binaryMessage.length) {
                    const bit = parseInt(binaryMessage[msgIndex]);
                    data[i + channel] = (data[i + channel] & 0xFE) | bit;
                    msgIndex++;
                } else {
                    break;
                }
            }
            if (msgIndex >= binaryMessage.length) break;
        }

        return newData;
    }

    // Extract message using LSB technique
    extractMessage(imageData) {
        const data = imageData.data;
        let binaryMessage = '';
        const dataLength = data.length;

        // Extract bits from RGB channels
        for (let i = 0; i < dataLength; i += 4) {
            for (let channel = 0; channel < 3; channel++) {
                binaryMessage += (data[i + channel] & 1).toString();
            }
        }

        // Convert to text and find end marker
        const extractedText = this.binaryToString(binaryMessage);
        const endIndex = extractedText.indexOf(this.endMarker);
        
        if (endIndex !== -1) {
            return extractedText.substring(0, endIndex);
        }
        
        return extractedText; // Return whatever we found
    }

    // Calculate image quality metric
    calculatePSNR(originalData, stegoData) {
        let mse = 0;
        const length = originalData.data.length;

        for (let i = 0; i < length; i++) {
            const diff = originalData.data[i] - stegoData.data[i];
            mse += diff * diff;
        }
        mse /= length;

        if (mse === 0) return Infinity;
        return 20 * Math.log10(255 / Math.sqrt(mse));
    }

    // Calculate maximum message capacity
    calculateCapacity(imageData) {
        // Each pixel has 3 channels (RGB), each storing 1 bit
        const bitsAvailable = (imageData.data.length / 4) * 3;
        // 8 bits per character
        return Math.floor(bitsAvailable / 8);
    }
}

class SteganographyApp {
    constructor() {
        this.stego = new SteganographyLSB();
        this.currentMode = 'embed';
        this.originalImageData = null;
        this.currentStegoImage = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // File uploads
        document.getElementById('cover-image').addEventListener('change', (e) => {
            this.previewImage(e.target, 'cover-preview');
            this.updateCapacity();
        });

        document.getElementById('stego-upload').addEventListener('change', (e) => {
            this.previewImage(e.target, 'stego-upload-preview');
        });

        // Message input
        document.getElementById('secret-message').addEventListener('input', (e) => {
            this.updateMessageInfo(e.target.value);
        });

        // Action buttons
        document.getElementById('embed-btn').addEventListener('click', () => {
            this.embedMessage();
        });

        document.getElementById('extract-btn').addEventListener('click', () => {
            this.extractMessage();
        });

        document.getElementById('download-btn').addEventListener('click', () => {
            this.downloadStegoImage();
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.toggle('active', content.id === `${mode}-mode`);
        });
        
        this.clearResults();
    }

    previewImage(input, previewId) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById(previewId);
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                
                if (previewId === 'cover-preview') {
                    this.loadImageData(e.target.result).then(imageData => {
                        this.originalImageData = imageData;
                        this.updateCapacity();
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    }

    async loadImageData(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    resolve(imageData);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    }

    updateCapacity() {
        if (this.originalImageData) {
            const capacity = this.stego.calculateCapacity(this.originalImageData);
            document.getElementById('message-capacity').textContent = `Capacity: ${capacity} characters`;
        }
    }

    updateMessageInfo(message) {
        document.getElementById('message-length').textContent = `${message.length} characters`;
        
        if (this.originalImageData) {
            const capacity = this.stego.calculateCapacity(this.originalImageData);
            const capacityElement = document.getElementById('message-capacity');
            
            if (message.length > capacity) {
                capacityElement.style.color = '#e74c3c';
                capacityElement.textContent = `⚠️ Too long! Max: ${capacity} chars`;
            } else {
                capacityElement.style.color = '#27ae60';
                capacityElement.textContent = `Capacity: ${capacity} chars (${capacity - message.length} left)`;
            }
        }
    }

    async embedMessage() {
        const imageInput = document.getElementById('cover-image');
        const message = document.getElementById('secret-message').value.trim();

        if (!imageInput.files[0]) {
            this.showError('Please select a cover image');
            return;
        }

        if (!message) {
            this.showError('Please enter a secret message');
            return;
        }

        try {
            this.setButtonLoading('embed-btn', true);
            
            const imageData = await this.getImageDataFromInput(imageInput);
            const capacity = this.stego.calculateCapacity(imageData);
            
            if (message.length > capacity) {
                this.showError(`Message too long! Maximum capacity is ${capacity} characters.`);
                this.setButtonLoading('embed-btn', false);
                return;
            }

            console.log('Embedding message:', message);
            
            const stegoData = this.stego.embedMessage(imageData, message);

            if (!stegoData) {
                throw new Error('Failed to embed message');
            }

            const psnr = this.stego.calculatePSNR(imageData, stegoData);
            this.createStegoImage(stegoData, psnr);

        } catch (error) {
            console.error('Embed error:', error);
            this.showError('Error: ' + error.message);
        } finally {
            this.setButtonLoading('embed-btn', false);
        }
    }

    async extractMessage() {
        const imageInput = document.getElementById('stego-upload');

        if (!imageInput.files[0]) {
            this.showError('Please select a stego image');
            return;
        }

        try {
            this.setButtonLoading('extract-btn', true);
            document.getElementById('extract-status').textContent = 'Processing...';

            const imageData = await this.getImageDataFromInput(imageInput);
            console.log('Extracting message...');
            
            const message = this.stego.extractMessage(imageData);
            console.log('Extracted:', message);

            this.showExtractResult(message);

        } catch (error) {
            console.error('Extract error:', error);
            this.showError('Error: ' + error.message);
        } finally {
            this.setButtonLoading('extract-btn', false);
        }
    }

    async getImageDataFromInput(input) {
        return new Promise((resolve, reject) => {
            const file = input.files[0];
            if (!file) {
                reject(new Error('No file selected'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        resolve(imageData);
                    } catch (error) {
                        reject(error);
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    createStegoImage(stegoData, psnr) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = stegoData.width;
            canvas.height = stegoData.height;
            
            ctx.putImageData(stegoData, 0, 0);
            
            const stegoImageUrl = canvas.toDataURL('image/png');
            this.currentStegoImage = stegoImageUrl;

            // Update UI
            document.getElementById('psnr-value').textContent = psnr.toFixed(2);
            
            let quality = 'Excellent';
            if (psnr < 40) quality = 'Good';
            if (psnr < 30) quality = 'Acceptable';
            
            document.getElementById('embed-status').textContent = `${quality} quality - Message embedded successfully`;
            
            const stegoImg = document.getElementById('stego-image');
            stegoImg.src = stegoImageUrl;
            stegoImg.style.display = 'block';
            
            document.getElementById('embed-result').classList.remove('hidden');

        } catch (error) {
            console.error('Create stego image error:', error);
            this.showError('Failed to create stego image: ' + error.message);
        }
    }

    showExtractResult(message) {
        const extractedText = document.getElementById('extracted-text');
        const statusElement = document.getElementById('extract-status');
        
        if (message && message.length > 0) {
            extractedText.value = message;
            statusElement.textContent = '✅ Message extracted successfully!';
            statusElement.style.color = '#27ae60';
        } else {
            extractedText.value = '';
            statusElement.textContent = '❌ No hidden message found in this image.';
            statusElement.style.color = '#e74c3c';
        }
        
        document.getElementById('extract-result').classList.remove('hidden');
    }

    downloadStegoImage() {
        if (this.currentStegoImage) {
            const link = document.createElement('a');
            link.href = this.currentStegoImage;
            link.download = 'stego-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            this.showError('No stego image available to download');
        }
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.innerHTML = '<span class="loading"></span> Processing...';
            button.disabled = true;
        } else {
            button.innerHTML = buttonId === 'embed-btn' ? '🔒 Embed Message' : '🔍 Extract Message';
            button.disabled = false;
        }
    }

    showError(message) {
        alert('❌ ' + message);
    }

    clearResults() {
        document.getElementById('embed-result').classList.add('hidden');
        document.getElementById('extract-result').classList.add('hidden');
        this.currentStegoImage = null;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SteganographyApp();
    console.log('🔒 Steganography Lab Loaded Successfully');
});