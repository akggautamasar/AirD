// File count functionality
let fileCountData = {
    videos: 0,
    pdfs: 0,
    images: 0,
    documents: 0,
    audio: 0,
    folders: 0,
    others: 0,
    total: 0
};

// File type definitions
const fileTypes = {
    video: ['.mp4', '.mkv', '.webm', '.mov', '.avi', '.ts', '.ogv', '.m4v', '.flv', '.wmv', '.3gp', '.mpg', '.mpeg'],
    pdf: ['.pdf'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif'],
    document: ['.doc', '.docx', '.txt', '.rtf', '.odt', '.pages', '.tex', '.wpd'],
    audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.aiff']
};

// Get file type category
function getFileTypeCategory(fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    for (const [category, extensions] of Object.entries(fileTypes)) {
        if (extensions.includes(extension)) {
            return category;
        }
    }
    
    return 'others';
}

// Count files by type
function countFilesByType(directoryData) {
    const counts = {
        videos: 0,
        pdfs: 0,
        images: 0,
        documents: 0,
        audio: 0,
        folders: 0,
        others: 0,
        total: 0
    };

    const contents = directoryData.contents || {};
    
    for (const [key, item] of Object.entries(contents)) {
        if (item.type === 'folder') {
            counts.folders++;
        } else if (item.type === 'file') {
            const category = getFileTypeCategory(item.name);
            counts[category + 's']++; // Convert category to plural (video -> videos)
        }
        counts.total++;
    }

    return counts;
}

// Update file count display
function updateFileCountDisplay(counts) {
    fileCountData = counts;
    const statsContainer = document.getElementById('file-count-stats');
    
    if (!statsContainer) return;

    // Clear existing content
    statsContainer.innerHTML = '';

    // Only show stats if there are items
    if (counts.total === 0) {
        statsContainer.style.display = 'none';
        return;
    }

    statsContainer.style.display = 'flex';

    // Create count items for non-zero counts
    const countItems = [
        {
            key: 'folders',
            label: 'Folders',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>`,
            color: '#ff9800'
        },
        {
            key: 'videos',
            label: 'Videos',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>`,
            color: '#f44336'
        },
        {
            key: 'pdfs',
            label: 'PDFs',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>`,
            color: '#e53e3e'
        },
        {
            key: 'images',
            label: 'Images',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M21,19V5c0-1.1-0.9-2-2-2H5c-1.1,0-2,0.9-2,2v14c0,1.1,0.9,2,2,2h14C20.1,21,21,20.1,21,19z M8.5,13.5l2.5,3.01 L14.5,12l4.5,6H5L8.5,13.5z"/>
            </svg>`,
            color: '#4caf50'
        },
        {
            key: 'documents',
            label: 'Documents',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>`,
            color: '#2196f3'
        },
        {
            key: 'audio',
            label: 'Audio',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A3,3 0 0,0 7,16A3,3 0 0,0 10,19A3,3 0 0,0 13,16V7H19V5H12Z"/>
            </svg>`,
            color: '#9c27b0'
        },
        {
            key: 'others',
            label: 'Others',
            icon: `<svg class="file-count-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>`,
            color: '#607d8b'
        }
    ];

    // Add total count first
    if (counts.total > 0) {
        const totalItem = document.createElement('div');
        totalItem.className = 'file-count-item';
        totalItem.innerHTML = `
            <svg class="file-count-icon" viewBox="0 0 24 24" style="fill: #666;">
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
            </svg>
            <span class="file-count-number">${counts.total}</span>
            <span class="file-count-label">Total</span>
        `;
        statsContainer.appendChild(totalItem);
    }

    // Add individual type counts
    countItems.forEach(item => {
        const count = counts[item.key];
        if (count > 0) {
            const countItem = document.createElement('div');
            countItem.className = 'file-count-item';
            countItem.innerHTML = `
                ${item.icon.replace('class="file-count-icon"', `class="file-count-icon" style="fill: ${item.color};"`)}
                <span class="file-count-number">${count}</span>
                <span class="file-count-label">${item.label}</span>
            `;
            statsContainer.appendChild(countItem);
        }
    });
}

// Hide file count stats for special paths
function shouldShowFileCount(currentPath) {
    return !currentPath.startsWith('/trash') && 
           !currentPath.startsWith('/search_') && 
           !currentPath.startsWith('/share_');
}

// Update file count when directory changes
function updateFileCount(directoryData) {
    const currentPath = getCurrentPath();
    
    if (shouldShowFileCount(currentPath)) {
        const counts = countFilesByType(directoryData);
        updateFileCountDisplay(counts);
    } else {
        // Hide file count stats for special paths
        const statsContainer = document.getElementById('file-count-stats');
        if (statsContainer) {
            statsContainer.style.display = 'none';
        }
    }
}

// Export function for use in main.js
window.updateFileCount = updateFileCount;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // File count will be updated when directory is loaded
});