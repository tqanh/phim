// Main entry point - initializes the TV Box Movie App
import { 
    setMovies, setAllMovies, setCurrentPage, setIsSearching, setSearchQuery, 
    setCurrentMovieInfo, setCurrentFilter, movies, allMovies, currentPage, 
    isSearching, searchQuery, currentFilter 
} from './config.js';
import { fetchMovies, isSeries } from './api.js';
import { setupTVFocusIndicator, setupSearch } from './focus-manager.js';
import { navigateHorizontal, navigateVertical, scrollIntoView } from './navigation.js';
import { renderMoviesWithSections, appendMovies, showLoading, showError, clearSearchInput } from './movie-renderer.js';
import { openModal, closeModal } from './video-player.js';
import { fetchMovieDetails } from './api.js';
import { setupTVHelp, isHelpOverlayActive, closeHelpOverlay } from './tv-help.js';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadMovies();
    setupNavigation();
    setupSearch(handleSearch);
    setupTVFocusIndicator();
    setupTVHelp();
    
    // Auto-focus first element for TV Box
    setTimeout(() => {
        const firstNav = document.querySelector('.nav-item');
        if (firstNav) {
            firstNav.focus();
        }
    }, 500);
    
    // Prevent default scrolling with arrow keys
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const modal = document.getElementById('modalOverlay');
            if (!modal.classList.contains('active') && !isHelpOverlayActive()) {
                e.preventDefault();
            }
        }
    }, { passive: false });
});

// Load Movies from API with pagination
async function loadMovies(page = 1, append = false) {
    if (!append) {
        showLoading();
    }
    
    try {
        const data = await fetchMovies(page, searchQuery);
        
        if (data.status === true && data.items && Array.isArray(data.items)) {
            const pathImage = data.pathImage || 'https://img.ophim.live/uploads/movies/';
            
            // Filter movies based on current tab
            let filteredItems = data.items;
            if (currentFilter === 'series') {
                filteredItems = data.items.filter(isSeries);
            }
            
            if (append) {
                setMovies([...movies, ...filteredItems]);
                setAllMovies([...allMovies, ...filteredItems]);
                appendMovies(filteredItems, pathImage, playMovie);
            } else {
                setMovies(filteredItems);
                setAllMovies(filteredItems);
                setCurrentPage(page);
                renderMoviesWithSections(filteredItems, pathImage, loadMoreMovies, playMovie, currentFilter);
            }
            
            // Set initial focus
            setTimeout(() => {
                const firstNav = document.querySelector('.nav-item');
                if (firstNav) firstNav.focus();
            }, 100);
        } else if (isSearching) {
            // Search returned no results
            if (!append) {
                showError(`Không tìm thấy kết quả cho "${searchQuery}"`, clearSearchAndReload);
            }
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        if (!append) {
            if (isSearching) {
                showError('Lỗi tìm kiếm', clearSearchAndReload);
            } else {
                showError(`Lỗi tải phim: ${error.message}`, () => loadMovies());
            }
        }
    }
}

// Switch between Movies and Series tabs
function switchTab(tab) {
    if (tab === currentFilter) return;
    
    setCurrentFilter(tab);
    setCurrentPage(1);
    
    // Update UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === tab) {
            item.classList.add('active');
        }
    });
    
    // Reload content
    loadMovies(1, false);
}

// Handle search
function handleSearch(query) {
    if (query) {
        setIsSearching(true);
        setSearchQuery(query);
        loadMovies(1, false);
    } else {
        clearSearchAndReload();
    }
}

// Clear search and load default movies
function clearSearchAndReload() {
    setIsSearching(false);
    setSearchQuery('');
    clearSearchInput();
    loadMovies(1, false);
}

// Load more movies
async function loadMoreMovies() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Đang tải...';
        loadMoreBtn.disabled = true;
    }
    
    await loadMovies(currentPage + 1, true);
    setCurrentPage(currentPage + 1);
    
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = 'Tải thêm phim';
        loadMoreBtn.disabled = false;
    }
}

// Play Movie - Open Modal with video URL
async function playMovie(slug) {
    try {
        const data = await fetchMovieDetails(slug);
        
        if (data.status === true && data.episodes && Array.isArray(data.episodes)) {
            const episodes = data.episodes;
            let videoUrl = null;
            let episodeId = null;
            
            // Find first available video URL (prefer m3u8 over embed)
            for (const server of episodes) {
                if (server.server_data && server.server_data.length > 0) {
                    const firstEp = server.server_data[0];
                    // Prefer m3u8 for native player, fallback to embed
                    videoUrl = firstEp.link_m3u8 || firstEp.link_embed;
                    episodeId = firstEp.slug || 'ep1';
                    if (videoUrl) break;
                }
            }
            
            if (videoUrl) {
                setCurrentMovieInfo(data.movie);
                openModal(videoUrl, data.movie?.name || 'Phim', slug, episodeId);
            } else {
                alert('Không tìm thấy link phim!');
            }
        } else {
            alert('Không thể tải thông tin phim!');
        }
    } catch (error) {
        alert('Lỗi: ' + error.message);
    }
}

// Setup Navigation
function setupNavigation() {
    // Close button handler
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') closeModal();
    });

    // Tab navigation click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.dataset.section);
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                switchTab(item.dataset.section);
            }
        });
    });

    // Global keyboard handler
    document.addEventListener('keydown', handleKeyNavigation);
}

// Handle Keyboard Navigation
function handleKeyNavigation(e) {
    const modal = document.getElementById('modalOverlay');
    
    // If help overlay is active, let tv-help.js handle it
    if (isHelpOverlayActive()) {
        return;
    }

    // If modal is open - handle video controls
    if (modal.classList.contains('active')) {
        const video = document.getElementById('videoPlayer');
        const videoControls = document.querySelectorAll('.control-btn, .modal-close');
        const activeElement = document.activeElement;
        const currentIndex = Array.from(videoControls).indexOf(activeElement);

        // If video is focused, let video.onkeydown handle arrow keys
        if (activeElement === video) {
            return;
        }

        switch(e.key) {
            case 'Escape':
            case 'Backspace':
                e.preventDefault();
                closeModal();
                return;

            case 'Tab':
                e.preventDefault();
                // Cycle through controls
                const nextIndex = (currentIndex + 1) % videoControls.length;
                videoControls[nextIndex].focus();
                return;

            case 'ArrowRight':
                e.preventDefault();
                if (currentIndex < videoControls.length - 1) {
                    videoControls[currentIndex + 1].focus();
                }
                return;

            case 'ArrowLeft':
                e.preventDefault();
                if (currentIndex > 0) {
                    videoControls[currentIndex - 1].focus();
                }
                return;

            case 'ArrowDown':
                e.preventDefault();
                // Focus video player to use video shortcuts
                video.focus();
                return;

            case 'Enter':
                // Allow default button click behavior
                return;
        }
        return;
    }

    // Main navigation when modal is closed
    const activeElement = document.activeElement;

    switch(e.key) {
        case 's':
        case 'S':
            e.preventDefault();
            document.getElementById('searchInput').focus();
            break;

        case 'ArrowRight':
            e.preventDefault();
            navigateHorizontal('right');
            break;

        case 'ArrowLeft':
            e.preventDefault();
            navigateHorizontal('left');
            break;

        case 'ArrowDown':
            e.preventDefault();
            navigateVertical('down');
            break;

        case 'ArrowUp':
            e.preventDefault();
            navigateVertical('up');
            break;

        case 'Enter':
            if (activeElement.classList.contains('movie-item')) {
                e.preventDefault();
                playMovie(activeElement.dataset.slug);
            } else if (activeElement.classList.contains('nav-item')) {
                e.preventDefault();
                switchTab(activeElement.dataset.section);
            }
            break;
    }
}
