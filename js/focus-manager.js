// TV Focus Indicator - Shows current selection name
export function setupTVFocusIndicator() {
    const indicator = document.getElementById('tvFocusIndicator');
    let hideTimeout;

    function updateIndicator() {
        const active = document.activeElement;
        let text = '';

        if (active.classList.contains('nav-item')) {
            text = active.textContent;
        } else if (active.classList.contains('movie-item')) {
            const name = active.querySelector('.movie-details-title');
            text = name ? name.textContent : 'Phim';
        } else if (active.id === 'searchInput') {
            text = 'Tìm kiếm';
        } else if (active.id === 'loadMoreBtn') {
            text = 'Tải thêm phim';
        } else if (active.id === 'modalClose') {
            text = 'Thoát';
        } else if (active.classList.contains('control-btn')) {
            text = active.textContent;
        }

        if (text) {
            indicator.textContent = text;
            indicator.classList.add('active');

            // Hide after 2 seconds
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        }
    }

    // Update on focus change
    document.addEventListener('focusin', updateIndicator);
}

// Setup search functionality
export function setupSearch(onSearch) {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('focus', () => {
        searchInput.select();
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            onSearch(query);
        } else if (e.key === 'Escape') {
            searchInput.blur();
            const firstNav = document.querySelector('.nav-item');
            if (firstNav) firstNav.focus();
        }
    });
}
