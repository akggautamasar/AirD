let storageStatsCache = null;
let lastStatsFetch = 0;
const STATS_CACHE_DURATION = 60000;

async function fetchStorageStats(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && storageStatsCache && (now - lastStatsFetch < STATS_CACHE_DURATION)) {
        return storageStatsCache;
    }

    try {
        const response = await fetch('/api/getStorageStats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: localStorage.getItem('tg_drive_password') })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            storageStatsCache = data.stats;
            lastStatsFetch = now;
            return data.stats;
        }

        return null;
    } catch (error) {
        console.error('Error fetching storage stats:', error);
        return null;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showStorageDashboard() {
    fetchStorageStats(true).then(stats => {
        if (!stats) {
            showNotification('Unable to fetch storage statistics', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        const fileTypeColors = {
            video: '#3b82f6',
            audio: '#8b5cf6',
            document: '#f59e0b',
            image: '#10b981',
            other: '#6b7280'
        };

        const fileTypeIcons = {
            video: '🎥',
            audio: '🎵',
            document: '📄',
            image: '🖼️',
            other: '📦'
        };

        let fileTypesHTML = '';
        for (const [type, data] of Object.entries(stats.file_types)) {
            const percentage = stats.total_size > 0 ? ((data.size / stats.total_size) * 100).toFixed(1) : 0;
            fileTypesHTML += `
                <div class="file-type-stat">
                    <div class="file-type-header">
                        <span class="file-type-icon">${fileTypeIcons[type]}</span>
                        <span class="file-type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </div>
                    <div class="file-type-bar">
                        <div class="file-type-progress" style="width: ${percentage}%; background: ${fileTypeColors[type]}"></div>
                    </div>
                    <div class="file-type-info">
                        <span>${data.count} files</span>
                        <span>${formatBytes(data.size)} (${percentage}%)</span>
                    </div>
                </div>
            `;
        }

        let recentUploadsHTML = '';
        stats.recent_uploads.slice(0, 5).forEach(file => {
            recentUploadsHTML += `
                <div class="recent-file-item">
                    <span class="recent-file-icon">${fileTypeIcons[file.category]}</span>
                    <div class="recent-file-info">
                        <div class="recent-file-name">${file.name}</div>
                        <div class="recent-file-date">${file.upload_date}</div>
                    </div>
                    <span class="recent-file-size">${formatBytes(file.size)}</span>
                </div>
            `;
        });

        let largestFilesHTML = '';
        stats.largest_files.slice(0, 5).forEach(file => {
            largestFilesHTML += `
                <div class="recent-file-item">
                    <span class="recent-file-icon">${fileTypeIcons[file.category]}</span>
                    <div class="recent-file-info">
                        <div class="recent-file-name">${file.name}</div>
                    </div>
                    <span class="recent-file-size">${formatBytes(file.size)}</span>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-content storage-dashboard">
                <div class="modal-header">
                    <h3>📊 Storage Analytics Dashboard</h3>
                    <p>Comprehensive overview of your storage usage</p>
                </div>
                <div class="modal-body">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">📁</div>
                            <div class="stat-value">${stats.total_files}</div>
                            <div class="stat-label">Total Files</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">💾</div>
                            <div class="stat-value">${formatBytes(stats.total_size)}</div>
                            <div class="stat-label">Storage Used</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📂</div>
                            <div class="stat-value">${stats.total_folders}</div>
                            <div class="stat-label">Total Folders</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📈</div>
                            <div class="stat-value">${(stats.total_size / stats.total_files / 1024 / 1024).toFixed(2)} MB</div>
                            <div class="stat-label">Avg File Size</div>
                        </div>
                    </div>

                    <div class="storage-section">
                        <h4>📦 Storage by File Type</h4>
                        <div class="file-types-container">
                            ${fileTypesHTML}
                        </div>
                    </div>

                    <div class="storage-section">
                        <h4>🆕 Recent Uploads</h4>
                        <div class="recent-files-container">
                            ${recentUploadsHTML || '<p class="empty-state">No recent uploads</p>'}
                        </div>
                    </div>

                    <div class="storage-section">
                        <h4>🏆 Largest Files</h4>
                        <div class="recent-files-container">
                            ${largestFilesHTML || '<p class="empty-state">No files found</p>'}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="close-dashboard">Close</button>
                    <button class="btn btn-primary" id="refresh-stats">Refresh Stats</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const bgBlur = document.getElementById('bg-blur');
        if (bgBlur) bgBlur.classList.add('active');

        document.getElementById('close-dashboard').addEventListener('click', () => {
            modal.remove();
            if (bgBlur) bgBlur.classList.remove('active');
        });

        document.getElementById('refresh-stats').addEventListener('click', () => {
            modal.remove();
            if (bgBlur) bgBlur.classList.remove('active');
            showStorageDashboard();
        });
    });
}

window.showStorageDashboard = showStorageDashboard;
