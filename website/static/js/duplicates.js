async function findDuplicateFiles() {
    try {
        const response = await fetch('/api/findDuplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: localStorage.getItem('tg_drive_password') })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            showDuplicatesModal(data.duplicates);
        } else {
            showNotification('Failed to find duplicates', 'error');
        }
    } catch (error) {
        console.error('Error finding duplicates:', error);
        showNotification('Error finding duplicates', 'error');
    }
}

function showDuplicatesModal(duplicates) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    let totalWastedSpace = 0;
    let duplicatesHTML = '';

    if (duplicates.length === 0) {
        duplicatesHTML = '<div class="empty-state">🎉 No duplicate files found!</div>';
    } else {
        duplicates.forEach((dup, index) => {
            totalWastedSpace += dup.wasted_space;

            let filesListHTML = '';
            dup.files.forEach(file => {
                filesListHTML += `
                    <div class="duplicate-file-item">
                        <div class="duplicate-file-info">
                            <span class="duplicate-file-name">${file.name}</span>
                            <span class="duplicate-file-path">${file.path}</span>
                        </div>
                        <span class="duplicate-file-date">${file.upload_date}</span>
                    </div>
                `;
            });

            duplicatesHTML += `
                <div class="duplicate-group">
                    <div class="duplicate-header">
                        <div class="duplicate-title">
                            <span class="duplicate-icon">📄</span>
                            <span class="duplicate-name">${dup.files[0].name}</span>
                        </div>
                        <div class="duplicate-stats">
                            <span class="duplicate-badge">${dup.count} copies</span>
                            <span class="duplicate-waste">${formatBytes(dup.wasted_space)} wasted</span>
                        </div>
                    </div>
                    <div class="duplicate-files-list">
                        ${filesListHTML}
                    </div>
                </div>
            `;
        });
    }

    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>🔍 Duplicate Files Report</h3>
                <p>Found ${duplicates.length} duplicate file groups</p>
            </div>
            <div class="modal-body">
                ${duplicates.length > 0 ? `
                <div class="duplicates-summary">
                    <div class="summary-item">
                        <div class="summary-icon">📊</div>
                        <div class="summary-content">
                            <div class="summary-value">${duplicates.length}</div>
                            <div class="summary-label">Duplicate Groups</div>
                        </div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-icon">💾</div>
                        <div class="summary-content">
                            <div class="summary-value">${formatBytes(totalWastedSpace)}</div>
                            <div class="summary-label">Wasted Space</div>
                        </div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-icon">📁</div>
                        <div class="summary-content">
                            <div class="summary-value">${duplicates.reduce((sum, dup) => sum + dup.count, 0)}</div>
                            <div class="summary-label">Total Files</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                <div class="duplicates-container">
                    ${duplicatesHTML}
                </div>
            </div>
            <div class="modal-footer">
                <button id="close-duplicates" class="btn btn-secondary">Close</button>
                ${duplicates.length > 0 ? '<button id="refresh-duplicates" class="btn btn-primary">Refresh</button>' : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const bgBlur = document.getElementById('bg-blur');
    if (bgBlur) bgBlur.classList.add('active');

    document.getElementById('close-duplicates').addEventListener('click', () => {
        modal.remove();
        if (bgBlur) bgBlur.classList.remove('active');
    });

    const refreshBtn = document.getElementById('refresh-duplicates');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            modal.remove();
            if (bgBlur) bgBlur.classList.remove('active');
            findDuplicateFiles();
        });
    }
}

window.findDuplicateFiles = findDuplicateFiles;
