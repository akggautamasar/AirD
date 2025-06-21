// Enhanced Bulk Operations with Progress Tracking
class BulkOperationManager {
    constructor() {
        this.currentOperation = null;
        this.progressModal = null;
    }

    async executeBulkOperation(operation, items, options = {}) {
        this.currentOperation = {
            type: operation,
            items: items,
            total: items.length,
            completed: 0,
            failed: 0,
            errors: []
        };

        this.showProgressModal();
        
        try {
            switch (operation) {
                case 'move':
                    await this.bulkMoveOperation(items, options.destination);
                    break;
                case 'copy':
                    await this.bulkCopyOperation(items, options.destination);
                    break;
                case 'trash':
                    await this.bulkTrashOperation(items);
                    break;
                case 'restore':
                    await this.bulkRestoreOperation(items);
                    break;
                case 'delete':
                    await this.bulkDeleteOperation(items);
                    break;
                default:
                    throw new Error('Unknown operation: ' + operation);
            }
        } catch (error) {
            this.handleOperationError(error);
        } finally {
            this.hideProgressModal();
            this.showCompletionSummary();
        }
    }

    async bulkMoveOperation(items, destination) {
        for (const item of items) {
            try {
                const data = {
                    source_path: item.path,
                    destination_path: destination
                };
                
                const response = await postJson('/api/moveFileFolder', data);
                
                if (response.status === 'ok') {
                    this.currentOperation.completed++;
                } else {
                    this.currentOperation.failed++;
                    this.currentOperation.errors.push(`${item.name}: ${response.status}`);
                }
            } catch (error) {
                this.currentOperation.failed++;
                this.currentOperation.errors.push(`${item.name}: ${error.message}`);
            }
            
            this.updateProgress();
            
            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async bulkCopyOperation(items, destination) {
        for (const item of items) {
            try {
                const data = {
                    source_path: item.path,
                    destination_path: destination
                };
                
                const response = await postJson('/api/copyFileFolder', data);
                
                if (response.status === 'ok') {
                    this.currentOperation.completed++;
                } else {
                    this.currentOperation.failed++;
                    this.currentOperation.errors.push(`${item.name}: ${response.status}`);
                }
            } catch (error) {
                this.currentOperation.failed++;
                this.currentOperation.errors.push(`${item.name}: ${error.message}`);
            }
            
            this.updateProgress();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async bulkTrashOperation(items) {
        for (const item of items) {
            try {
                const data = {
                    path: item.path,
                    trash: true
                };
                
                const response = await postJson('/api/trashFileFolder', data);
                
                if (response.status === 'ok') {
                    this.currentOperation.completed++;
                } else {
                    this.currentOperation.failed++;
                    this.currentOperation.errors.push(`${item.name}: ${response.status}`);
                }
            } catch (error) {
                this.currentOperation.failed++;
                this.currentOperation.errors.push(`${item.name}: ${error.message}`);
            }
            
            this.updateProgress();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    async bulkRestoreOperation(items) {
        for (const item of items) {
            try {
                const data = {
                    path: item.path,
                    trash: false
                };
                
                const response = await postJson('/api/trashFileFolder', data);
                
                if (response.status === 'ok') {
                    this.currentOperation.completed++;
                } else {
                    this.currentOperation.failed++;
                    this.currentOperation.errors.push(`${item.name}: ${response.status}`);
                }
            } catch (error) {
                this.currentOperation.failed++;
                this.currentOperation.errors.push(`${item.name}: ${error.message}`);
            }
            
            this.updateProgress();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    async bulkDeleteOperation(items) {
        for (const item of items) {
            try {
                const data = {
                    path: item.path
                };
                
                const response = await postJson('/api/deleteFileFolder', data);
                
                if (response.status === 'ok') {
                    this.currentOperation.completed++;
                } else {
                    this.currentOperation.failed++;
                    this.currentOperation.errors.push(`${item.name}: ${response.status}`);
                }
            } catch (error) {
                this.currentOperation.failed++;
                this.currentOperation.errors.push(`${item.name}: ${error.message}`);
            }
            
            this.updateProgress();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    showProgressModal() {
        const modal = document.createElement('div');
        modal.className = 'bulk-progress';
        modal.innerHTML = `
            <div class="progress-header">
                <h3>Processing ${this.currentOperation.type} operation...</h3>
                <span class="progress-text">0 of ${this.currentOperation.total} items</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-details">
                <small>Please wait while the operation completes...</small>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.progressModal = modal;
    }

    updateProgress() {
        if (!this.progressModal) return;
        
        const processed = this.currentOperation.completed + this.currentOperation.failed;
        const percentage = (processed / this.currentOperation.total) * 100;
        
        const progressText = this.progressModal.querySelector('.progress-text');
        const progressFill = this.progressModal.querySelector('.progress-fill');
        
        progressText.textContent = `${processed} of ${this.currentOperation.total} items`;
        progressFill.style.width = percentage + '%';
    }

    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.remove();
            this.progressModal = null;
        }
    }

    showCompletionSummary() {
        const op = this.currentOperation;
        let message = '';
        
        if (op.failed === 0) {
            message = `✅ ${op.type} operation completed successfully!\n${op.completed} item${op.completed !== 1 ? 's' : ''} processed.`;
        } else {
            message = `⚠️ ${op.type} operation completed with some errors.\n${op.completed} item${op.completed !== 1 ? 's' : ''} succeeded, ${op.failed} failed.`;
            
            if (op.errors.length > 0) {
                message += '\n\nErrors:\n' + op.errors.slice(0, 5).join('\n');
                if (op.errors.length > 5) {
                    message += `\n... and ${op.errors.length - 5} more errors.`;
                }
            }
        }
        
        alert(message);
        
        // Refresh the page to show updated state
        window.location.reload();
    }

    handleOperationError(error) {
        console.error('Bulk operation error:', error);
        alert('An error occurred during the bulk operation: ' + error.message);
    }
}

// Global instance
const bulkOperationManager = new BulkOperationManager();

// Enhanced bulk operation functions
async function enhancedBulkMove() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    
    try {
        // Get folder tree
        if (!folderTreeData) {
            folderTreeData = await getFolderTree();
        }
        
        // Show destination selection modal
        await showDestinationSelectionModal('Move', selectedPaths);
    } catch (error) {
        alert('Failed to load folder tree: ' + error.message);
    }
}

async function enhancedBulkCopy() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    
    try {
        // Get folder tree
        if (!folderTreeData) {
            folderTreeData = await getFolderTree();
        }
        
        // Show destination selection modal
        await showDestinationSelectionModal('Copy', selectedPaths);
    } catch (error) {
        alert('Failed to load folder tree: ' + error.message);
    }
}

async function enhancedBulkTrash() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    const count = selectedPaths.length;
    
    if (!confirm(`Are you sure you want to move ${count} item${count !== 1 ? 's' : ''} to trash?`)) {
        return;
    }
    
    await bulkOperationManager.executeBulkOperation('trash', selectedPaths);
}

async function enhancedBulkRestore() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    const count = selectedPaths.length;
    
    if (!confirm(`Are you sure you want to restore ${count} item${count !== 1 ? 's' : ''}?`)) {
        return;
    }
    
    await bulkOperationManager.executeBulkOperation('restore', selectedPaths);
}

async function enhancedBulkDelete() {
    if (selectedItems.size === 0) return;
    
    const selectedPaths = getSelectedItemPaths();
    const count = selectedPaths.length;
    
    if (!confirm(`Are you sure you want to permanently delete ${count} item${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
        return;
    }
    
    await bulkOperationManager.executeBulkOperation('delete', selectedPaths);
}

async function showDestinationSelectionModal(operation, items) {
    return new Promise((resolve, reject) => {
        // Update modal for bulk operation
        document.getElementById('move-copy-title').textContent = `${operation} ${items.length} Items`;
        
        // Clear and populate folder tree
        const treeContainer = document.getElementById('folder-tree');
        treeContainer.innerHTML = '';
        
        renderFolderTree(folderTreeData, treeContainer, 0);
        
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
                await bulkOperationManager.executeBulkOperation('move', items, {
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
                await bulkOperationManager.executeBulkOperation('copy', items, {
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

// Export for global access
window.bulkOperationManager = bulkOperationManager;
window.enhancedBulkMove = enhancedBulkMove;
window.enhancedBulkCopy = enhancedBulkCopy;
window.enhancedBulkTrash = enhancedBulkTrash;
window.enhancedBulkRestore = enhancedBulkRestore;
window.enhancedBulkDelete = enhancedBulkDelete;