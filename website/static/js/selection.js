// File Selection System
let selectedItems = new Set();
let selectionMode = false;
let lastSelectedIndex = -1;

// Initialize selection system
document.addEventListener('DOMContentLoaded', function() {
    initializeSelectionSystem();
});

function initializeSelectionSystem() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Add selection toolbar
    createSelectionToolbar();
    
    // Update directory display to include checkboxes
    const originalShowDirectory = window.showDirectory;
    window.showDirectory = function(data) {
        originalShowDirectory(data);
        addSelectionCheckboxes();
        updateSelectionToolbar();
    };
}

function createSelectionToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'selection-toolbar';
    toolbar.className = 'selection-toolbar';
    toolbar.innerHTML = `
        <div class="selection-info">
            <span id="selection-count">0 items selected</span>
        </div>
        <div class="selection-actions">
            <button id="select-all-btn" class="selection-btn">Select All</button>
            <button id="deselect-all-btn" class="selection-btn">Deselect All</button>
            <button id="bulk-move-btn" class="selection-btn" disabled>Move</button>
            <button id="bulk-copy-btn" class="selection-btn" disabled>Copy</button>
            <button id="bulk-trash-btn" class="selection-btn" disabled>Trash</button>
            <button id="bulk-restore-btn" class="selection-btn" disabled style="display: none;">Restore</button>
            <button id="bulk-delete-btn" class="selection-btn danger" disabled style="display: none;">Delete</button>
            <button id="bulk-download-btn" class="selection-btn" disabled>Download</button>
        </div>
    `;
    
    // Insert toolbar before directory
    const directory = document.querySelector('.directory');
    directory.parentNode.insertBefore(toolbar, directory);
    
    // Add event listeners
    document.getElementById('select-all-btn').addEventListener('click', selectAll);
    document.getElementById('deselect-all-btn').addEventListener('click', deselectAll);
    document.getElementById('bulk-move-btn').addEventListener('click', () => {
        if (window.enhancedBulkMove) {
            window.enhancedBulkMove();
        } else {
            bulkMove();
        }
    });
    document.getElementById('bulk-copy-btn').addEventListener('click', () => {
        if (window.enhancedBulkCopy) {
            window.enhancedBulkCopy();
        } else {
            bulkCopy();
        }
    });
    document.getElementById('bulk-trash-btn').addEventListener('click', () => {
        if (window.enhancedBulkTrash) {
            window.enhancedBulkTrash();
        } else {
            bulkTrash();
        }
    });
    document.getElementById('bulk-restore-btn').addEventListener('click', () => {
        if (window.enhancedBulkRestore) {
            window.enhancedBulkRestore();
        } else {
            bulkRestore();
        }
    });
    document.getElementById('bulk-delete-btn').addEventListener('click', () => {
        if (window.enhancedBulkDelete) {
            window.enhancedBulkDelete();
        } else {
            bulkDelete();
        }
    });
    document.getElementById('bulk-download-btn').addEventListener('click', bulkDownload);
}

function addSelectionCheckboxes() {
    const rows = document.querySelectorAll('.body-tr');
    const isTrash = getCurrentPath().includes('/trash');
    
    rows.forEach((row, index) => {
        // Add checkbox column
        const checkboxCell = document.createElement('td');
        checkboxCell.innerHTML = `
            <div class="td-align">
                <input type="checkbox" class="item-checkbox" data-id="${row.getAttribute('data-id')}" data-index="${index}">
            </div>
        `;
        row.insertBefore(checkboxCell, row.firstChild);
        
        // Add click handler for row selection
        row.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox' && !e.target.closest('.more-btn')) {
                const checkbox = this.querySelector('.item-checkbox');
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+click for individual selection
                    toggleItemSelection(checkbox);
                } else if (e.shiftKey && lastSelectedIndex !== -1) {
                    // Shift+click for range selection
                    selectRange(lastSelectedIndex, index);
                } else if (selectionMode) {
                    // In selection mode, single click toggles
                    toggleItemSelection(checkbox);
                }
            }
        });
        
        // Add checkbox change handler
        const checkbox = checkboxCell.querySelector('.item-checkbox');
        checkbox.addEventListener('change', function() {
            toggleItemSelection(this);
        });
    });
    
    // Update table header
    const headerRow = document.querySelector('.directory table thead tr');
    const headerCheckbox = document.createElement('th');
    headerCheckbox.innerHTML = `
        <input type="checkbox" id="select-all-checkbox" title="Select All">
    `;
    headerRow.insertBefore(headerCheckbox, headerRow.firstChild);
    
    // Add select all checkbox handler
    document.getElementById('select-all-checkbox').addEventListener('change', function() {
        if (this.checked) {
            selectAll();
        } else {
            deselectAll();
        }
    });
    
    // Show/hide appropriate bulk action buttons based on context
    updateBulkActionButtons(isTrash);
}

function updateBulkActionButtons(isTrash) {
    const moveBtn = document.getElementById('bulk-move-btn');
    const copyBtn = document.getElementById('bulk-copy-btn');
    const trashBtn = document.getElementById('bulk-trash-btn');
    const restoreBtn = document.getElementById('bulk-restore-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');
    
    if (isTrash) {
        moveBtn.style.display = 'none';
        copyBtn.style.display = 'none';
        trashBtn.style.display = 'none';
        restoreBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
    } else {
        moveBtn.style.display = 'inline-block';
        copyBtn.style.display = 'inline-block';
        trashBtn.style.display = 'inline-block';
        restoreBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }
}

function toggleItemSelection(checkbox) {
    const itemId = checkbox.getAttribute('data-id');
    const index = parseInt(checkbox.getAttribute('data-index'));
    
    if (checkbox.checked) {
        selectedItems.add(itemId);
        checkbox.closest('tr').classList.add('selected');
        lastSelectedIndex = index;
    } else {
        selectedItems.delete(itemId);
        checkbox.closest('tr').classList.remove('selected');
    }
    
    selectionMode = selectedItems.size > 0;
    updateSelectionToolbar();
    updateSelectAllCheckbox();
}

function selectAll() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            toggleItemSelection(checkbox);
        }
    });
}

function deselectAll() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            toggleItemSelection(checkbox);
        }
    });
    selectedItems.clear();
    selectionMode = false;
    updateSelectionToolbar();
    updateSelectAllCheckbox();
}

function selectRange(startIndex, endIndex) {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    for (let i = start; i <= end; i++) {
        if (checkboxes[i] && !checkboxes[i].checked) {
            checkboxes[i].checked = true;
            toggleItemSelection(checkboxes[i]);
        }
    }
}

function updateSelectionToolbar() {
    const count = selectedItems.size;
    const countElement = document.getElementById('selection-count');
    const actionButtons = document.querySelectorAll('.selection-actions .selection-btn:not(#select-all-btn):not(#deselect-all-btn)');
    
    countElement.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
    
    actionButtons.forEach(btn => {
        btn.disabled = count === 0;
    });
    
    // Show/hide toolbar based on selection
    const toolbar = document.getElementById('selection-toolbar');
    if (count > 0) {
        toolbar.classList.add('active');
    } else {
        toolbar.classList.remove('active');
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkedCount = document.querySelectorAll('.item-checkbox:checked').length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'a':
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    selectAll();
                }
                break;
            case 'd':
                if (selectedItems.size > 0) {
                    e.preventDefault();
                    deselectAll();
                }
                break;
        }
    }
    
    if (e.key === 'Delete' && selectedItems.size > 0) {
        e.preventDefault();
        const isTrash = getCurrentPath().includes('/trash');
        if (isTrash) {
            if (window.enhancedBulkDelete) {
                window.enhancedBulkDelete();
            } else {
                bulkDelete();
            }
        } else {
            if (window.enhancedBulkTrash) {
                window.enhancedBulkTrash();
            } else {
                bulkTrash();
            }
        }
    }
}

// Bulk Operations (fallback implementations)
async function bulkMove() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    if (selectedPaths.length === 1) {
        // Use existing move modal for single item
        const item = selectedPaths[0];
        showMoveModal(item.path, item.name);
    } else {
        // Show bulk move modal
        showBulkMoveModal(selectedPaths);
    }
}

async function bulkCopy() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    if (selectedPaths.length === 1) {
        // Use existing copy modal for single item
        const item = selectedPaths[0];
        showCopyModal(item.path, item.name);
    } else {
        // Show bulk copy modal
        showBulkCopyModal(selectedPaths);
    }
}

async function bulkTrash() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Are you sure you want to move ${count} item${count !== 1 ? 's' : ''} to trash?`)) {
        return;
    }
    
    const selectedPaths = getSelectedItemPaths();
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of selectedPaths) {
        try {
            const data = {
                'path': item.path,
                'trash': true
            };
            const response = await postJson('/api/trashFileFolder', data);
            
            if (response.status === 'ok') {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }
    
    if (errorCount === 0) {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} moved to trash successfully`);
    } else {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} moved to trash, ${errorCount} failed`);
    }
    
    window.location.reload();
}

async function bulkRestore() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Are you sure you want to restore ${count} item${count !== 1 ? 's' : ''}?`)) {
        return;
    }
    
    const selectedPaths = getSelectedItemPaths();
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of selectedPaths) {
        try {
            const data = {
                'path': item.path,
                'trash': false
            };
            const response = await postJson('/api/trashFileFolder', data);
            
            if (response.status === 'ok') {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }
    
    if (errorCount === 0) {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} restored successfully`);
    } else {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} restored, ${errorCount} failed`);
    }
    
    window.location.reload();
}

async function bulkDelete() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Are you sure you want to permanently delete ${count} item${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
        return;
    }
    
    const selectedPaths = getSelectedItemPaths();
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of selectedPaths) {
        try {
            const data = {
                'path': item.path
            };
            const response = await postJson('/api/deleteFileFolder', data);
            
            if (response.status === 'ok') {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }
    
    if (errorCount === 0) {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} deleted successfully`);
    } else {
        alert(`${successCount} item${successCount !== 1 ? 's' : ''} deleted, ${errorCount} failed`);
    }
    
    window.location.reload();
}

async function bulkDownload() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    const files = selectedPaths.filter(item => item.type === 'file');
    
    if (files.length === 0) {
        alert('No files selected for download');
        return;
    }
    
    if (files.length === 1) {
        // Single file download
        const file = files[0];
        const downloadUrl = `/file?path=${file.path}`;
        window.open(downloadUrl, '_blank');
    } else {
        // Multiple files - open each in new tab
        if (confirm(`This will open ${files.length} download tabs. Continue?`)) {
            files.forEach(file => {
                const downloadUrl = `/file?path=${file.path}`;
                window.open(downloadUrl, '_blank');
            });
        }
    }
}

function getSelectedItemPaths() {
    const selectedPaths = [];
    selectedItems.forEach(itemId => {
        const row = document.querySelector(`tr[data-id="${itemId}"]`);
        if (row) {
            const path = row.getAttribute('data-path') + '/' + itemId;
            const name = row.getAttribute('data-name') || row.querySelector('.td-align').textContent.trim();
            const type = row.classList.contains('folder-tr') ? 'folder' : 'file';
            selectedPaths.push({ path, name, type, id: itemId });
        }
    });
    return selectedPaths;
}

// Bulk Move/Copy Modal Functions
function showBulkMoveModal(items) {
    currentMoveCopyItem = { items, operation: 'bulk-move' };
    showBulkMoveCopyModal('Move Items', items.length);
}

function showBulkCopyModal(items) {
    currentMoveCopyItem = { items, operation: 'bulk-copy' };
    showBulkMoveCopyModal('Copy Items', items.length);
}

async function showBulkMoveCopyModal(title, count) {
    try {
        selectedDestinationPath = null;
        
        // Get folder tree
        if (!folderTreeData) {
            folderTreeData = await getFolderTree();
        }
        
        // Update modal title
        document.getElementById('move-copy-title').textContent = `${title} (${count} items)`;
        
        // Clear and populate folder tree
        const treeContainer = document.getElementById('folder-tree');
        treeContainer.innerHTML = '';
        
        renderFolderTree(folderTreeData, treeContainer, 0);
        
        // Show appropriate buttons
        const moveBtn = document.getElementById('move-item-btn');
        const copyBtn = document.getElementById('copy-item-btn');
        
        if (currentMoveCopyItem.operation === 'bulk-move') {
            moveBtn.style.display = 'block';
            copyBtn.style.display = 'none';
            moveBtn.textContent = `Move ${count} Items`;
        } else {
            moveBtn.style.display = 'none';
            copyBtn.style.display = 'block';
            copyBtn.textContent = `Copy ${count} Items`;
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

// Export functions for global access
window.selectedItems = selectedItems;
window.selectionMode = selectionMode;
window.selectAll = selectAll;
window.deselectAll = deselectAll;
window.getSelectedItemPaths = getSelectedItemPaths;