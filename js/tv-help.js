// TV Help Overlay functionality
export function setupTVHelp() {
    const helpOverlay = document.getElementById('tvHelpOverlay');
    
    // Toggle help overlay with H key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            helpOverlay.classList.toggle('active');
        }
    });
    
    // Close help overlay with OK, Enter, Back, or Escape
    document.addEventListener('keydown', (e) => {
        if (helpOverlay.classList.contains('active')) {
            if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Enter') {
                e.preventDefault();
                helpOverlay.classList.remove('active');
            }
        }
    });
}

// Check if help overlay is active
export function isHelpOverlayActive() {
    return document.getElementById('tvHelpOverlay')?.classList.contains('active');
}

// Close help overlay programmatically
export function closeHelpOverlay() {
    document.getElementById('tvHelpOverlay')?.classList.remove('active');
}
