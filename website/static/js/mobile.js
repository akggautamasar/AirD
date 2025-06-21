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
            document.getElementById('mobile-menu-toggle').click();
        }
    }
    
    // Swipe left to close menu
    if (swipeDistanceX < -swipeThreshold && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        const bgBlur = document.getElementById('bg-blur');
        bgBlur.style.opacity = '0';
        setTimeout(() => {
            if (!bgBlur.style.opacity || bgBlur.style.opacity === '0') {
                bgBlur.style.zIndex = '-1';
            }
        }, 300);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Improve touch interactions for file/folder items
document.addEventListener('DOMContentLoaded', function() {
    // Add touch feedback for interactive elements
    function addTouchFeedback() {
        const interactiveElements = document.querySelectorAll('.body-tr, .more-btn, .sidebar-menu a, .new-button');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
                this.style.transition = 'transform 0.1s ease';
            }, { passive: true });
            
            element.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            }, { passive: true });
            
            element.addEventListener('touchcancel', function() {
                this.style.transform = 'scale(1)';
            }, { passive: true });
        });
    }
    
    // Initial setup
    addTouchFeedback();
    
    // Re-apply after dynamic content loads
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if new interactive elements were added
                const hasInteractiveElements = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('body-tr') || 
                        node.querySelector?.('.body-tr, .more-btn')
                    )
                );
                
                if (hasInteractiveElements) {
                    setTimeout(addTouchFeedback, 100);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Optimize modal positioning for mobile keyboards
function adjustModalForKeyboard() {
    const modals = document.querySelectorAll('.create-new-folder, .file-uploader');
    
    modals.forEach(modal => {
        const inputs = modal.querySelectorAll('input[type="text"], input[type="password"]');
        
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        modal.style.transform = 'translate(-50%, -60%)';
                        modal.style.transition = 'transform 0.3s ease';
                    }, 300);
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
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }
            }
        });
        
        input.addEventListener('blur', function() {
            if (window.innerWidth <= 768) {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                }
            }
        });
    });
}

// Handle safe area insets for devices with notches
function handleSafeAreaInsets() {
    if (window.innerWidth <= 768) {
        const style = document.createElement('style');
        style.textContent = `
            @supports (padding-top: env(safe-area-inset-top)) {
                .main-content {
                    padding-top: calc(70px + env(safe-area-inset-top));
                }
                
                .mobile-menu-toggle {
                    top: calc(15px + env(safe-area-inset-top));
                }
                
                .sidebar {
                    padding-top: calc(15px + env(safe-area-inset-top));
                }
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
        document.body.style.maxWidth = '100vw';
        document.documentElement.style.maxWidth = '100vw';
    };
    
    preventHorizontalScroll();
    
    // Re-apply on window resize
    window.addEventListener('resize', preventHorizontalScroll);
});

// Handle viewport height changes (mobile browser address bar)
function handleViewportHeight() {
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100);
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
        
        // Add scroll indicators
        const scrollIndicator = document.createElement('div');
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
        `;
        
        tableWrapper.style.position = 'relative';
        tableWrapper.appendChild(scrollIndicator);
        
        // Show/hide scroll indicator
        tableWrapper.addEventListener('scroll', function() {
            const canScrollRight = this.scrollLeft < (this.scrollWidth - this.clientWidth - 5);
            scrollIndicator.style.opacity = canScrollRight ? '1' : '0';
        });
        
        // Initial check
        const canScrollRight = tableWrapper.scrollLeft < (tableWrapper.scrollWidth - tableWrapper.clientWidth - 5);
        scrollIndicator.style.opacity = canScrollRight ? '1' : '0';
    }
}

// Apply table optimizations when content loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(optimizeTableScrolling, 500);
    
    // Re-apply when directory content changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'directory-data') {
                setTimeout(optimizeTableScrolling, 100);
            }
        });
    });
    
    const directoryData = document.getElementById('directory-data');
    if (directoryData) {
        observer.observe(directoryData, {
            childList: true,
            subtree: true
        });
    }
});
