// Breadcrumb navigation functionality
let folderNameCache = {};

// Function to build breadcrumb navigation
async function buildBreadcrumb(currentPath) {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (!breadcrumbContainer) return;

    // Clear existing breadcrumb
    breadcrumbContainer.innerHTML = '';

    // Handle special paths
    if (currentPath === '/trash') {
        breadcrumbContainer.innerHTML = `
            <div class="breadcrumb-item current">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Trash
            </div>
        `;
        return;
    }

    if (currentPath.startsWith('/search_')) {
        const query = decodeURIComponent(currentPath.split('_')[1]);
        breadcrumbContainer.innerHTML = `
            <div class="breadcrumb-item current">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Search: ${query}
            </div>
        `;
        return;
    }

    if (currentPath.startsWith('/share_')) {
        const sharePath = currentPath.split('_')[1];
        await buildShareBreadcrumb(sharePath);
        return;
    }

    // Build normal path breadcrumb
    await buildNormalBreadcrumb(currentPath);
}

// Build breadcrumb for shared folders
async function buildShareBreadcrumb(sharePath) {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    
    // Add shared folder indicator
    const sharedItem = document.createElement('div');
    sharedItem.className = 'breadcrumb-item';
    sharedItem.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>
        Shared
    `;
    breadcrumbContainer.appendChild(sharedItem);

    // Add separator
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.textContent = '/';
    breadcrumbContainer.appendChild(separator);

    // Build the rest of the path
    await buildNormalBreadcrumb(sharePath, true);
}

// Build breadcrumb for normal paths
async function buildNormalBreadcrumb(currentPath, isShared = false) {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    
    // Add home/root item if not shared
    if (!isShared) {
        const homeItem = document.createElement('div');
        homeItem.className = 'breadcrumb-item breadcrumb-home';
        homeItem.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Root
        `;
        
        if (currentPath === '/') {
            homeItem.classList.add('current');
        } else {
            homeItem.addEventListener('click', () => {
                window.location.href = '/?path=/';
            });
        }
        
        breadcrumbContainer.appendChild(homeItem);
    }

    // If we're at root, we're done
    if (currentPath === '/') return;

    // Split path and build breadcrumb items
    const pathParts = currentPath.split('/').filter(part => part !== '');
    let currentBuildPath = '/';

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentBuildPath += part;

        // Add separator
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '/';
        breadcrumbContainer.appendChild(separator);

        // Get folder name
        const folderName = await getFolderName(currentBuildPath, part);
        
        // Create breadcrumb item
        const item = document.createElement('div');
        item.className = 'breadcrumb-item';
        item.textContent = folderName;
        item.title = folderName; // Full name on hover
        
        // If this is the current folder, mark it as current
        if (i === pathParts.length - 1) {
            item.classList.add('current');
        } else {
            // Make it clickable
            const clickPath = currentBuildPath;
            item.addEventListener('click', () => {
                const auth = getFolderAuthFromPath();
                let url = `/?path=${clickPath}`;
                if (auth && isShared) {
                    url += `&auth=${auth}`;
                }
                window.location.href = url;
            });
        }
        
        breadcrumbContainer.appendChild(item);
        currentBuildPath += '/';
    }
}

// Get folder name from cache or fetch from server
async function getFolderName(folderPath, folderId) {
    // Check cache first
    if (folderNameCache[folderId]) {
        return folderNameCache[folderId];
    }

    try {
        // Get parent directory to find folder name
        const parentPath = folderPath.substring(0, folderPath.lastIndexOf('/')) || '/';
        const auth = getFolderAuthFromPath();
        
        const data = { 
            'path': parentPath, 
            'auth': auth,
            'sort_by': 'name',
            'sort_order': 'asc'
        };
        
        const json = await postJson('/api/getDirectory', data);
        
        if (json.status === 'ok') {
            const contents = json.data.contents;
            
            // Find the folder with matching ID
            for (const [key, item] of Object.entries(contents)) {
                if (item.type === 'folder' && item.id === folderId) {
                    folderNameCache[folderId] = item.name;
                    return item.name;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching folder name:', error);
    }

    // Fallback to folder ID if name not found
    return folderId;
}

// Clear folder name cache when needed
function clearFolderNameCache() {
    folderNameCache = {};
}

// Update breadcrumb when directory changes
function updateBreadcrumb() {
    const currentPath = getCurrentPath();
    if (currentPath !== 'redirect') {
        buildBreadcrumb(currentPath);
    }
}

// Initialize breadcrumb on page load
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other scripts are loaded
    setTimeout(updateBreadcrumb, 100);
});

// Export functions for use in other scripts
window.updateBreadcrumb = updateBreadcrumb;
window.clearFolderNameCache = clearFolderNameCache;
