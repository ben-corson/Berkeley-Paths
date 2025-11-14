// ============================================================================
// Berkeley Paths - Dark Mode Toggle
// ============================================================================

/**
 * Initialize dark mode based on saved user preference or system preference
 */
function initializeDarkMode() {
    // Check if user has a saved preference in localStorage
    const savedTheme = localStorage.getItem('berkeley-paths-theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        // No saved preference - check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }
}

/**
 * Toggle between light and dark mode
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Save user preference
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('berkeley-paths-theme', isDarkMode ? 'dark' : 'light');
    
    // Update button text
    updateToggleButton();
    
    // Refresh map if needed (optional)
    refreshMap();
}

/**
 * Update toggle button text
 */
function updateToggleButton() {
    const button = document.querySelector('.dark-mode-toggle');
    if (button) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        button.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    }
}

/**
 * Refresh Leaflet map when theme changes (if applicable)
 */
function refreshMap() {
    // If you're using Leaflet maps, this ensures they render correctly
    if (typeof L !== 'undefined' && window.map) {
        setTimeout(() => {
            window.map.invalidateSize();
        }, 100);
    }
}

/**
 * Listen for system theme changes
 */
if (window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeMediaQuery.addEventListener('change', function(e) {
        // Only auto-update if user hasn't manually set a preference
        if (!localStorage.getItem('berkeley-paths-theme')) {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            updateToggleButton();
        }
    });
}

/**
 * Create and add the toggle button to the page
 */
function createToggleButton() {
    // Check if button already exists
    if (document.querySelector('.dark-mode-toggle')) {
        return;
    }
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'dark-mode-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle dark mode');
    toggleButton.onclick = toggleDarkMode;
    
    // Set initial text
    const isDarkMode = document.body.classList.contains('dark-mode');
    toggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    
    document.body.appendChild(toggleButton);
}

/**
 * Initialize everything when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeDarkMode();
    createToggleButton();
});

// Optional: Keyboard shortcut (press 'D' to toggle dark mode)
document.addEventListener('keydown', function(e) {
    // Only trigger if not typing in an input field
    const activeElement = document.activeElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
    
    if (e.key === 'd' && !isInputField && !e.ctrlKey && !e.metaKey) {
        toggleDarkMode();
    }
});

// Export functions for use elsewhere if needed
if (typeof window !== 'undefined') {
    window.berkeleyPathsDarkMode = {
        toggle: toggleDarkMode,
        initialize: initializeDarkMode
    };
}
