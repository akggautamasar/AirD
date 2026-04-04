async function generateEmbedCode(filePath, fileName) {
    try {
        const response = await fetch('/api/getEmbedCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            showEmbedCodeModal(data.embed_url, data.iframe_code, fileName);
        } else {
            showNotification('Failed to generate embed code', 'error');
        }
    } catch (error) {
        console.error('Error generating embed code:', error);
        showNotification('Error generating embed code', 'error');
    }
}

function showEmbedCodeModal(embedUrl, iframeCode, fileName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>🔗 Embed Player Code</h3>
                <p>Embed ${fileName} on your website</p>
            </div>
            <div class="modal-body">
                <div class="embed-section">
                    <label class="embed-label">Direct Player URL:</label>
                    <div class="embed-input-group">
                        <input type="text" value="${embedUrl}" readonly class="embed-input">
                        <button class="btn btn-outline" id="copy-embed-url">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>

                <div class="embed-section">
                    <label class="embed-label">iFrame Embed Code:</label>
                    <div class="embed-input-group">
                        <textarea readonly class="embed-textarea">${iframeCode}</textarea>
                        <button class="btn btn-outline" id="copy-iframe-code">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>

                <div class="embed-section">
                    <label class="embed-label">Preview:</label>
                    <div class="embed-preview">
                        <iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>
                    </div>
                </div>

                <div class="embed-options">
                    <h4>Embed Options:</h4>
                    <p class="embed-hint">Add these parameters to the URL for customization:</p>
                    <ul class="embed-params-list">
                        <li><code>?autoplay=false</code> - Disable autoplay</li>
                        <li><code>?loop=true</code> - Enable loop playback</li>
                        <li><code>?branding=false</code> - Hide branding watermark</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button id="test-embed" class="btn btn-outline">Open in New Tab</button>
                <button id="close-embed" class="btn btn-secondary">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const bgBlur = document.getElementById('bg-blur');
    if (bgBlur) bgBlur.classList.add('active');

    document.getElementById('close-embed').addEventListener('click', () => {
        modal.remove();
        if (bgBlur) bgBlur.classList.remove('active');
    });

    document.getElementById('copy-embed-url').addEventListener('click', () => {
        const input = modal.querySelector('.embed-input');
        input.select();
        document.execCommand('copy');
        showNotification('Embed URL copied to clipboard', 'success');
    });

    document.getElementById('copy-iframe-code').addEventListener('click', () => {
        const textarea = modal.querySelector('.embed-textarea');
        textarea.select();
        document.execCommand('copy');
        showNotification('iFrame code copied to clipboard', 'success');
    });

    document.getElementById('test-embed').addEventListener('click', () => {
        window.open(embedUrl, '_blank');
    });
}

window.generateEmbedCode = generateEmbedCode;
