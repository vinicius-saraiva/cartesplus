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

function goToStep2() {
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

function goToStep1() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
} 