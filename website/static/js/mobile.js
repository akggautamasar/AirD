// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const bgBlur = document.getElementById('bg-blur');
    
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnToggle = mobileMenuToggle.contains(e.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('open')) {
                closeMobileMenu();
            }
        }
    });
    
    // Close menu when clicking on sidebar links (mobile)
    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
        
        // Prevent horizontal scroll on resize
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
    });
    
    // Prevent horizontal scroll on load
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    function toggleMobileMenu() {
        if (sidebar.classList.contains('open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }
    
    function openMobileMenu() {
        sidebar.classList.add('open');
        bgBlur.style.zIndex = '150';
        bgBlur.style.opacity = '0.3';
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
    }
    
    function closeMobileMenu() {
        sidebar.classList.remove('open');
        bgBlur.style.opacity = '0';
        setTimeout(() => {
            // Only reset zIndex if opacity is still 0 (prevents race conditions if menu reopens quickly)
            if (!bgBlur.style.opacity || bgBlur.style.opacity === '0') {
                bgBlur.style.zIndex = '-1';
            }
        }, 300);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
    
    // Prevent menu close when interacting with new-upload dropdown
    const newUpload = document.getElementById('new-upload');
    if (newUpload) {
        newUpload.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            // Ensure no horizontal scroll after orientation change
            document.body.style.overflowX = 'hidden';
            document.documentElement.style.overflowX = 'hidden';
            
            // Close mobile menu on orientation change
            if (sidebar.classList.contains('open')) {
                closeMobileMenu();
            }
        }, 100);
    });
});

// Touch gesture support for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
}, { passive: true });

function handleSwipeGesture() {
    const sidebar = document.getElementById('sidebar');
    const swipeThreshold = 50;
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = Math.abs(touchEndY - touchStartY);
    
    // Only handle horizontal swipes (ignore vertical scrolling)
    if (swipeDistanceY > swipeThreshold) return;
    
    // Swipe right to open menu (only if starting from left edge)
    if (swipeDistanceX > swipeThreshold && touchStartX < 50 && window.innerWidth <= 768) {
        if (!sidebar.classList.contains('open')) {
            // Simulate click on toggle to use existing openMenu logic
            document.getElementById('mobile-menu-toggle').click();
        }
    }
    
    // Swipe left to close menu
    if (swipeDistanceX < -swipeThreshold && sidebar.classList.contains('open')) {
        // Simulate click on toggle to use existing closeMenu logic
        document.getElementById('mobile-menu-toggle').click();
    }
}

// Improve touch interactions for file/folder items
document.addEventListener('DOMContentLoaded', function() {
    // Add touch feedback for interactive elements
    function addTouchFeedback() {
        // Query elements that are or contain interactive items
        const interactiveElements = document.querySelectorAll('.body-tr, .more-btn, .sidebar-menu a, .new-button, .selection-btn, .sort-select, .sort-order-btn, .breadcrumb-item');
        
        interactiveElements.forEach(element => {
            // Remove previous listeners to prevent duplicates if function is called multiple times
            element.removeEventListener('touchstart', applyTouchDownEffect);
            element.removeEventListener('touchend', applyTouchUpEffect);
            element.removeEventListener('touchcancel', applyTouchUpEffect);

            element.addEventListener('touchstart', applyTouchDownEffect, { passive: true });
            element.addEventListener('touchend', applyTouchUpEffect, { passive: true });
            element.addEventListener('touchcancel', applyTouchUpEffect, { passive: true });
        });
    }

    function applyTouchDownEffect() {
        this.style.transform = 'scale(0.98)';
        this.style.transition = 'transform 0.1s ease';
    }

    function applyTouchUpEffect() {
        this.style.transform = 'scale(1)';
    }
    
    // Initial setup
    addTouchFeedback();
    
    // Re-apply after dynamic content loads (e.g., directory data, selection toolbar)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if new interactive elements were added or content in directory changes
                const isRelevantChange = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('body-tr') || 
                        node.classList?.contains('selection-toolbar') ||
                        node.querySelector?.('.body-tr, .more-btn, .selection-btn')
                    )
                ) || (mutation.target.id === 'directory-data' || mutation.target.classList.contains('selection-actions'));
                
                if (isRelevantChange) {
                    setTimeout(addTouchFeedback, 100);
                }
            }
        });
    });
    
    // Observe the body for changes, including subtree for dynamically added elements
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Optimize modal positioning for mobile keyboards
function adjustModalForKeyboard() {
    const modals = document.querySelectorAll('.create-new-folder, .file-uploader');
    
    modals.forEach(modal => {
        const inputs = modal.querySelectorAll('input[type="text"], input[type="password"], input[type="file"], input[type="url"]');
        
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (window.innerWidth <= 768) {
                    // Slightly lift the modal when keyboard appears
                    setTimeout(() => {
                        modal.style.transform = 'translate(-50%, -65%)'; // Adjusted lift
                        modal.style.transition = 'transform 0.3s ease';
                    }, 100); // Short delay to allow keyboard to appear
                }
            });
            
            input.addEventListener('blur', function() {
                if (window.innerWidth <= 768) {
                    modal.style.transform = 'translate(-50%, -50%)';
                }
            });
        });
    });
}

// Prevent zoom on input focus (iOS Safari)
function preventZoomOnFocus() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    // Temporarily set maximum-scale to 1.0 to prevent zoom
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }
            }
        });
        
        input.addEventListener('blur', function() {
            if (window.innerWidth <= 768) {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    // Restore original viewport setting
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                }
            }
        });
    });
}

// Handle safe area insets for devices with notches
function handleSafeAreaInsets() {
    // Apply only if the browser supports `env()` CSS function
    if (window.CSS && window.CSS.supports('padding-top', 'env(safe-area-inset-top)')) {
        const style = document.createElement('style');
        style.textContent = `
            body {
                /* General padding for safe areas, affecting all edges */
                padding-top: env(safe-area-inset-top);
                padding-right: env(safe-area-inset-right);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
            }
            
            .main-content {
                /* Adjust main content padding to ensure elements aren't under status bar/notch */
                padding-top: calc(70px + env(safe-area-inset-top));
            }
            
            .mobile-menu-toggle {
                top: calc(15px + env(safe-area-inset-top));
                left: calc(15px + env(safe-area-inset-left));
            }
            
            .sidebar {
                padding-top: calc(15px + env(safe-area-inset-top));
                padding-left: calc(15px + env(safe-area-inset-left));
                padding-bottom: calc(15px + env(safe-area-inset-bottom));
            }

            .bulk-progress {
                top: calc(10px + env(safe-area-inset-top));
                right: calc(10px + env(safe-area-inset-right));
                left: calc(10px + env(safe-area-inset-left));
            }

            .create-new-folder, .file-uploader, .bulk-action-modal {
                /* Adjust position for modals to avoid notch/bottom bar interference */
                top: min(50%, calc(50% + env(safe-area-inset-top) / 2));
                transform: translate(-50%, min(-50%, calc(-50% + env(safe-area-inset-top) / 2)));
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize all mobile optimizations
document.addEventListener('DOMContentLoaded', function() {
    adjustModalForKeyboard();
    preventZoomOnFocus();
    handleSafeAreaInsets();
    
    // Ensure no horizontal scroll
    const preventHorizontalScroll = () => {
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.maxWidth = '100vw'; // Explicitly set max-width
        document.documentElement.style.maxWidth = '100vw'; // Explicitly set max-width
    };
    
    preventHorizontalScroll();
    
    // Re-apply on window resize and orientation change
    window.addEventListener('resize', preventHorizontalScroll);
    window.addEventListener('orientationchange', () => {
        setTimeout(preventHorizontalScroll, 100);
    });
});

// Handle viewport height changes (mobile browser address bar)
// This uses the Visual Viewport API for more accurate height calculation on mobile
function handleViewportHeight() {
    const setVH = () => {
        // Fallback for browsers not supporting visualViewport (though most modern mobiles do)
        const vh = window.visualViewport ? window.visualViewport.height * 0.01 : window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH(); // Set initially
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setVH); // Listen to visual viewport changes
    } else {
        window.addEventListener('resize', setVH); // Fallback to window resize
    }
    window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100); // Re-evaluate on orientation change
    });
}

// Initialize viewport height handling
document.addEventListener('DOMContentLoaded', handleViewportHeight);


// Optimize table scrolling on mobile
function optimizeTableScrolling() {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper && window.innerWidth <= 768) {
        // Add momentum scrolling for iOS
        tableWrapper.style.webkitOverflowScrolling = 'touch';
        
        // Remove any existing scroll indicator to prevent duplicates
        const existingIndicator = tableWrapper.querySelector('.scroll-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Add scroll indicators
        const scrollIndicator = document.createElement('div');
        scrollIndicator.classList.add('scroll-indicator'); // Add a class for easier selection/removal
        scrollIndicator.style.cssText = `
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 20px;
            background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1; /* Ensure indicator is above table content but below modals */
        `;
        
        tableWrapper.style.position = 'relative'; // Ensure wrapper is positioned for absolute indicator
        tableWrapper.appendChild(scrollIndicator);
        
        // Show/hide scroll indicator based on scroll position
        const updateScrollIndicator = () => {
            // Check if content is wider than viewport and if there's scrollable content to the right
            const hasHorizontalScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth;
            const canScrollRight = tableWrapper.scrollLeft < (tableWrapper.scrollWidth - tableWrapper.clientWidth - 5); // 5px buffer
            scrollIndicator.style.opacity = (hasHorizontalScroll && canScrollRight) ? '1' : '0';
        };

        tableWrapper.addEventListener('scroll', updateScrollIndicator);
        
        // Initial check and re-check on resize/orientation change
        updateScrollIndicator();
        window.addEventListener('resize', updateScrollIndicator);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateScrollIndicator, 100);
        });
    }
}

// Apply table optimizations when content loads and changes
document.addEventListener('DOMContentLoaded', function() {
    // Initial call with a slight delay
    setTimeout(optimizeTableScrolling, 500);
    
    // Observe changes to the directory data and re-apply optimizations
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'directory-data' || mutation.target.classList.contains('directory')) {
                setTimeout(optimizeTableScrolling, 100);
            }
        });
    });
    
    const directoryData = document.getElementById('directory-data');
    const directoryContainer = document.querySelector('.directory'); // Observe parent too
    if (directoryData) {
        observer.observe(directoryData, {
            childList: true,
            subtree: true // Observe children of directory-data
        });
    }
    if (directoryContainer) {
        observer.observe(directoryContainer, {
            childList: true,
            attributes: true, // In case directory class changes
            subtree: false // Only observe direct changes to .directory
        });
    }
});
