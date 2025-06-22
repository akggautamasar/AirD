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

// Render folder tree in modal with proper expansion/collapse
function renderFolderTree(tree, container, level = 0, excludePath = null) {
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-level', level);
    
    // Add indentation for nested folders
    if (level > 0) {
        folderItem.style.paddingLeft = `${level * 20 + 12}px`;
    } else {
        folderItem.style.paddingLeft = '12px';
    }
    
    // Disable selection of the source folder and its children for move operations
    const isDisabled = excludePath && (tree.path === excludePath || tree.path.startsWith(excludePath + '/'));
    if (isDisabled) {
        folderItem.classList.add('disabled');
    }
    
    // Check if folder has children
    const hasChildren = tree.children && tree.children.length > 0;
    
    folderItem.innerHTML = `
        <div class="folder-item-content">
            ${hasChildren ? '<span class="folder-toggle">▶</span>' : '<span class="folder-toggle-spacer"></span>'}
            <svg class="folder-icon" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
            <span class="folder-name">${tree.name === '/' ? 'Root' : tree.name}</span>
        </div>
    `;
    
    folderItem.setAttribute('data-path', tree.path);
    
    // Add click handler for folder selection
    if (!isDisabled) {
        const folderContent = folderItem.querySelector('.folder-item-content');
        folderContent.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // If clicking on toggle, handle expansion
            if (e.target.classList.contains('folder-toggle')) {
                toggleFolderExpansion(folderItem, tree);
                return;
            }
            
            // Remove previous selection
            container.querySelectorAll('.folder-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select current item
            folderItem.classList.add('selected');
            selectedDestinationPath = folderItem.getAttribute('data-path');
        });
    }
    
    container.appendChild(folderItem);
    
    // Create children container
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'folder-children';
        childrenContainer.style.display = 'none'; // Initially collapsed
        
        // Render children
        tree.children.forEach(child => {
            renderFolderTree(child, childrenContainer, level + 1, excludePath);
        });
        
        container.appendChild(childrenContainer);
        
        // Store reference to children container
        folderItem.childrenContainer = childrenContainer;
        
        // Add toggle functionality
        const toggle = folderItem.querySelector('.folder-toggle');
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFolderExpansion(folderItem, tree);
            });
        }
    }
}

// Toggle folder expansion/collapse
function toggleFolderExpansion(folderItem, tree) {
    const toggle = folderItem.querySelector('.folder-toggle');
    const childrenContainer = folderItem.childrenContainer;
    
    if (!childrenContainer) return;
    
    const isExpanded = childrenContainer.style.display !== 'none';
    
    if (isExpanded) {
        // Collapse
        childrenContainer.style.display = 'none';
        toggle.textContent = '▶';
        folderItem.classList.remove('expanded');
    } else {
        // Expand
        childrenContainer.style.display = 'block';
        toggle.textContent = '▼';
        folderItem.classList.add('expanded');
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
        
        // Auto-expand root folder
        const rootFolder = treeContainer.querySelector('.folder-item');
        if (rootFolder && rootFolder.childrenContainer) {
            toggleFolderExpansion(rootFolder, folderTreeData);
        }
        
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

// Enhanced bulk operation functions for move/copy modal
async function showDestinationSelectionModal(operation, items) {
    return new Promise((resolve, reject) => {
        // Update modal for bulk operation
        document.getElementById('move-copy-title').textContent = `${operation} ${items.length} Items`;
        
        // Clear and populate folder tree
        const treeContainer = document.getElementById('folder-tree');
        treeContainer.innerHTML = '';
        
        renderFolderTree(folderTreeData, treeContainer, 0);
        
        // Auto-expand root folder
        const rootFolder = treeContainer.querySelector('.folder-item');
        if (rootFolder && rootFolder.childrenContainer) {
            toggleFolderExpansion(rootFolder, folderTreeData);
        }
        
        // Update buttons
        const moveBtn = document.getElementById('move-item-btn');
        const copyBtn = document.getElementById('copy-item-btn');
        
        // Remove existing event listeners
        const newMoveBtn = moveBtn.cloneNode(true);
        const newCopyBtn = copyBtn.cloneNode(true);
        moveBtn.parentNode.replaceChild(newMoveBtn, moveBtn);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
        
        if (operation === 'Move') {
            newMoveBtn.style.display = 'block';
            newCopyBtn.style.display = 'none';
            newMoveBtn.textContent = `Move ${items.length} Items`;
            
            newMoveBtn.addEventListener('click', async () => {
                if (!selectedDestinationPath) {
                    alert('Please select a destination folder');
                    return;
                }
                
                closeMoveCopyModal();
                await window.bulkOperationManager.executeBulkOperation('move', items, {
                    destination: selectedDestinationPath
                });
                resolve();
            });
        } else {
            newMoveBtn.style.display = 'none';
            newCopyBtn.style.display = 'block';
            newCopyBtn.textContent = `Copy ${items.length} Items`;
            
            newCopyBtn.addEventListener('click', async () => {
                if (!selectedDestinationPath) {
                    alert('Please select a destination folder');
                    return;
                }
                
                closeMoveCopyModal();
                await window.bulkOperationManager.executeBulkOperation('copy', items, {
                    destination: selectedDestinationPath
                });
                resolve();
            });
        }
        
        // Show modal
        document.getElementById('bg-blur').style.zIndex = '2';
        document.getElementById('bg-blur').style.opacity = '0.1';
        document.getElementById('move-copy-modal').style.zIndex = '3';
        document.getElementById('move-copy-modal').style.opacity = '1';
        
        // Handle cancel
        const cancelBtn = document.getElementById('move-copy-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', () => {
            closeMoveCopyModal();
            resolve();
        });
    });
}