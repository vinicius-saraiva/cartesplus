let codeReader;
let scanning = false;

async function generatePass() {
    const barcodeInput = document.getElementById('barcodeInput').value;
    const barcodeNumber = barcodeInput.trim();
    
    if (!barcodeNumber) {
        alert('Veuillez entrer un numéro de code-barres');
        return;
    }

    try {
        const response = await fetch('/generate-pass', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ barcodeNumber })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Échec de la génération du pass');
        }

        const data = await response.json();
        window.location.href = data.saveUrl;
    } catch (error) {
        alert('Erreur lors de la génération du pass : ' + error.message);
    }
}

async function deletePass() {
    const barcodeNumber = document.getElementById('barcodeInput').value;
    if (!barcodeNumber) {
        alert('Please enter a barcode number');
        return;
    }

    try {
        const response = await fetch(`/delete-pass/${barcodeNumber}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete pass');
        }

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        alert('Error deleting pass: ' + error.message);
    }
}

async function getExistingPass() {
    const barcodeNumber = '0 000009 022775'; // Formatted exactly as it appears on your card
    
    try {
        const response = await fetch(`/get-pass/${barcodeNumber}`);
        if (!response.ok) {
            throw new Error('Failed to get pass');
        }

        const data = await response.json();
        window.location.href = data.saveUrl;
    } catch (error) {
        alert('Error getting pass: ' + error.message);
    }
}

async function startScanner() {
    try {
        // Initialize code reader if not already done
        if (!codeReader) {
            codeReader = new ZXing.BrowserMultiFormatReader();
        }

        // Show camera container with animation
        const container = document.getElementById('camera-container');
        container.classList.remove('hidden');
        // Force reflow
        container.offsetHeight;
        container.classList.add('visible');
        
        // Get video element
        const videoElement = document.getElementById('camera-view');
        
        // Start scanning
        scanning = true;
        const stream = await codeReader.decodeFromConstraints(
            {
                video: {
                    facingMode: "environment",
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                }
            },
            videoElement,
            (result, error) => {
                if (result && scanning) {
                    // Stop scanning
                    scanning = false;
                    stopScanner();
                    
                    // Update input with scanned code
                    const barcodeInput = document.getElementById('barcodeInput');
                    barcodeInput.value = result.text;
                    
                    // Go to step 2
                    goToStep2();
                }
                // Ignore errors as they happen frequently while scanning
            }
        );
    } catch (error) {
        alert('Erreur d\'accès à la caméra: ' + error.message);
        console.error(error);
    }
}

function stopScanner() {
    const container = document.getElementById('camera-container');
    container.classList.remove('visible');
    if (codeReader) {
        setTimeout(() => {
            codeReader.reset();
            container.classList.add('hidden');
        }, 500); // Wait for animation to complete
    }
    scanning = false;
}

function goToStep1() {
    stopScanner(); // Stop scanner when going back
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
}

function goToStep2() {
    stopScanner(); // Stop scanner when moving to step 2
    const barcodeInput = document.getElementById('barcodeInput').value;
    const barcodeNumber = barcodeInput.trim();
    
    if (!barcodeNumber) {
        alert('Veuillez entrer un numéro de code-barres');
        return;
    }

    // Update preview numbers
    document.getElementById('previewPassNumber').textContent = barcodeNumber;
    document.getElementById('previewBarcodeNumber').textContent = barcodeNumber;

    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
}

async function generateApplePass() {
    const barcodeInput = document.getElementById('barcodeInput').value;
    const barcodeNumber = barcodeInput.trim();
    
    if (!barcodeNumber) {
        alert('Veuillez entrer un numéro de code-barres');
        return;
    }

    try {
        console.log('Sending request to generate Apple Pass...');
        const response = await fetch('/generate-apple-pass', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ barcodeNumber })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to generate pass');
        }

        // Handle the .pkpass file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `climbing-card-${barcodeNumber}.pkpass`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Apple Pass Error:', error);
        alert('Erreur lors de la génération du pass Apple Wallet: ' + error.message);
    }
}

function clearInput() {
    const input = document.getElementById('barcodeInput');
    const clearButton = input.parentElement.querySelector('.clear-input-new');
    input.value = '';
    input.focus();
    clearButton.classList.remove('visible');
}

// Add this at the beginning of your file with other event listeners
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('barcodeInput');
    const clearButton = input.parentElement.querySelector('.clear-input-new');
    
    input.addEventListener('input', function() {
        clearButton.classList.toggle('visible', this.value.length > 0);
    });
}); 