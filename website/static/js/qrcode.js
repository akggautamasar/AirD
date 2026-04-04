async function generateQRCode(url, title = 'QR Code') {
    try {
        const response = await fetch('/api/generateQRCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            showQRCodeModal(data.qr_code, url, title);
        } else {
            showNotification('Failed to generate QR code', 'error');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        showNotification('Error generating QR code', 'error');
    }
}

function showQRCodeModal(qrCodeDataUrl, url, title) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📱 ${title}</h3>
                <p>Scan this QR code to access on mobile</p>
            </div>
            <div class="modal-body qr-modal-body">
                <div class="qr-code-container">
                    <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code-image">
                </div>
                <div class="qr-url-container">
                    <input type="text" value="${url}" readonly class="qr-url-input">
                    <button class="btn btn-outline" id="copy-qr-url">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button id="download-qr" class="btn btn-primary">Download QR Code</button>
                <button id="close-qr" class="btn btn-secondary">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const bgBlur = document.getElementById('bg-blur');
    if (bgBlur) bgBlur.classList.add('active');

    document.getElementById('close-qr').addEventListener('click', () => {
        modal.remove();
        if (bgBlur) bgBlur.classList.remove('active');
    });

    document.getElementById('copy-qr-url').addEventListener('click', () => {
        const input = modal.querySelector('.qr-url-input');
        input.select();
        document.execCommand('copy');
        showNotification('URL copied to clipboard', 'success');
    });

    document.getElementById('download-qr').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = 'qr-code.png';
        link.click();
        showNotification('QR code downloaded', 'success');
    });
}

function generateFileQRCode(filePath, fileName) {
    const baseUrl = window.location.origin;
    const fileUrl = `${baseUrl}/file?path=${encodeURIComponent(filePath)}`;
    generateQRCode(fileUrl, `QR Code - ${fileName}`);
}

window.generateQRCode = generateQRCode;
window.generateFileQRCode = generateFileQRCode;
