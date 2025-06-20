// Move and Copy functionality
let selectedDestinationPath = null;
let currentMoveCopyItem = null;
let folderTreeData = null;

// Get folder tree from server
async function getFolderTree() {
    const data = {};
    const json = await postJson('/api/getFolderTree', data);
    if (json.status === 'ok') {
        return json.data;
    } else {
        throw new Error('Failed to get folder tree');
    }
}

// Render folder tree in modal
function renderFolderTree(tree, container, level = 0, excludePath = null) {
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    
    // Add indentation for nested folders
    if (level > 0) {
        folderItem.classList.add('folder-indent');
        folderItem.style.marginLeft = `${level * 20}px`;
    }
    
    // Disable selection of the source folder and its children
    const isDisabled = excludePath && (tree.path === excludePath || tree.path.startsWith(excludePath + '/'));
    if (isDisabled) {
        folderItem.classList.add('disabled');
    }
    
    folderItem.innerHTML = `
        <svg class="folder-icon" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
        </svg>
        ${tree.name === '/' ? 'Root' : tree.name}
    `;
    
    folderItem.setAttribute('data-path', tree.path);
    
    if (!isDisabled) {
        folderItem.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Remove previous selection
            container.querySelectorAll('.folder-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select current item
            this.classList.add('selected');
            selectedDestinationPath = this.getAttribute('data-path');
        });
    }
    
    container.appendChild(folderItem);
    
    // Render children
    if (tree.children && tree.children.length > 0) {
        tree.children.forEach(child => {
            renderFolderTree(child, container, level + 1, excludePath);
        });
    }
}

// Show move/copy modal
async function showMoveCopyModal(itemPath, itemName, operation = 'move') {
    try {
        currentMoveCopyItem = { path: itemPath, name: itemName };
        selectedDestinationPath = null;
        
        // Get folder tree
        folderTreeData = await getFolderTree();
        
        // Update modal title
        const title = operation === 'move' ? 'Move Item' : 'Copy Item';
        document.getElementById('move-copy-title').textContent = title;
        
        // Clear and populate folder tree
        const treeContainer = document.getElementById('folder-tree');
        treeContainer.innerHTML = '';
        
        // Exclude the source folder path for move operations to prevent moving into itself
        const excludePath = operation === 'move' ? itemPath : null;
        renderFolderTree(folderTreeData, treeContainer, 0, excludePath);
        
        // Show/hide appropriate buttons
        const moveBtn = document.getElementById('move-item-btn');
        const copyBtn = document.getElementById('copy-item-btn');
        
        if (operation === 'move') {
            moveBtn.style.display = 'block';
            copyBtn.style.display = 'none';
        } else {
            moveBtn.style.display = 'none';
            copyBtn.style.display = 'block';
        }
        
        // Show modal
        document.getElementById('bg-blur').style.zIndex = '2';
        document.getElementById('bg-blur').style.opacity = '0.1';
        document.getElementById('move-copy-modal').style.zIndex = '3';
        document.getElementById('move-copy-modal').style.opacity = '1';
        
    } catch (error) {
        alert('Failed to load folder tree: ' + error.message);
    }
}

// Close move/copy modal
function closeMoveCopyModal() {
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('bg-blur').style.zIndex = '-1';
    }, 300);
    document.getElementById('move-copy-modal').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('move-copy-modal').style.zIndex = '-1';
    }, 300);
    
    selectedDestinationPath = null;
    currentMoveCopyItem = null;
}

// Move item
async function moveItem() {
    if (!selectedDestinationPath || !currentMoveCopyItem) {
        alert('Please select a destination folder');
        return;
    }
    
    try {
        const data = {
            source_path: currentMoveCopyItem.path,
            destination_path: selectedDestinationPath
        };
        
        const response = await postJson('/api/moveFileFolder', data);
        
        if (response.status === 'ok') {
            alert('Item moved successfully');
            closeMoveCopyModal();
            window.location.reload();
        } else {
            alert('Failed to move item: ' + response.status);
        }
    } catch (error) {
        alert('Error moving item: ' + error.message);
    }
}

// Copy item
async function copyItem() {
    if (!selectedDestinationPath || !currentMoveCopyItem) {
        alert('Please select a destination folder');
        return;
    }
    
    try {
        const data = {
            source_path: currentMoveCopyItem.path,
            destination_path: selectedDestinationPath
        };
        
        const response = await postJson('/api/copyFileFolder', data);
        
        if (response.status === 'ok') {
            alert('Item copied successfully');
            closeMoveCopyModal();
            window.location.reload();
        } else {
            alert('Failed to copy item: ' + response.status);
        }
    } catch (error) {
        alert('Error copying item: ' + error.message);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cancel button
    document.getElementById('move-copy-cancel').addEventListener('click', closeMoveCopyModal);
    
    // Move button
    document.getElementById('move-item-btn').addEventListener('click', moveItem);
    
    // Copy button
    document.getElementById('copy-item-btn').addEventListener('click', copyItem);
});

// Functions to be called from file click handler
function showMoveModal(itemPath, itemName) {
    showMoveCopyModal(itemPath, itemName, 'move');
}

function showCopyModal(itemPath, itemName) {
    showMoveCopyModal(itemPath, itemName, 'copy');
}
