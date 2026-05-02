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
            // Flatten all episodes from all servers into a single array
            let allEpisodes = [];
            for (const server of data.episodes) {
                if (server.server_data && server.server_data.length > 0) {
                    allEpisodes = [...allEpisodes, ...server.server_data];
                }
            }
            
            if (allEpisodes.length === 0) {
                alert('Không tìm thấy tập phim nào!');
                return;
            }
            
            // Get first episode
            const firstEp = allEpisodes[0];
            const videoUrl = firstEp.link_m3u8 || firstEp.link_embed;
            const episodeId = firstEp.slug || 'ep1';
            
            if (videoUrl) {
                setCurrentMovieInfo(data.movie);
                openModal(videoUrl, data.movie?.name || 'Phim', slug, episodeId, allEpisodes, 0);
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
        const videoControls = document.querySelectorAll('.control-btn');
        const episodeItems = document.querySelectorAll('.episode-item');
        const activeElement = document.activeElement;
        const controlIndex = Array.from(videoControls).indexOf(activeElement);
        const episodeIndex = Array.from(episodeItems).indexOf(activeElement);

        // If video is focused, let video.onkeydown handle arrow keys
        if (activeElement === video) {
            return;
        }

        // If episode item is focused
        if (episodeIndex >= 0) {
            switch(e.key) {
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    closeModal();
                    return;
                case 'ArrowLeft':
                    e.preventDefault();
                    // Go back to first control button (Play/Pause)
                    const firstControl = document.querySelector('.control-btn');
                    if (firstControl) firstControl.focus();
                    return;
                case 'Enter':
                    // Play the episode - handled by episode item's own listener
                    return;
            }
            return;
        }

        // If control button is focused
        if (controlIndex >= 0) {
            switch(e.key) {
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    closeModal();
                    return;
                case 'Tab':
                    e.preventDefault();
                    // Find next enabled control button (cycle)
                    for (let i = 1; i < videoControls.length; i++) {
                        const nextIndex = (controlIndex + i) % videoControls.length;
                        if (!videoControls[nextIndex].disabled) {
                            videoControls[nextIndex].focus();
                            break;
                        }
                    }
                    return;
                case 'ArrowRight':
                    e.preventDefault();
                    // Find next enabled control button (cycle to beginning if at end)
                    for (let i = 1; i < videoControls.length; i++) {
                        const nextIndex = (controlIndex + i) % videoControls.length;
                        if (!videoControls[nextIndex].disabled) {
                            videoControls[nextIndex].focus();
                            break;
                        }
                    }
                    return;
                case 'ArrowLeft':
                    e.preventDefault();
                    // Find previous enabled control button
                    for (let i = controlIndex - 1; i >= 0; i--) {
                        if (!videoControls[i].disabled) {
                            videoControls[i].focus();
                            return;
                        }
                    }
                    // No enabled button found, go back to video
                    video.focus();
                    return;
                case 'ArrowUp':
                    e.preventDefault();
                    // Go back to video player
                    video.focus();
                    return;
                case 'ArrowDown':
                    e.preventDefault();
                    // Go to episode panel
                    const epToFocus = document.querySelector('.episode-item.active') || episodeItems[0];
                    if (epToFocus) {
                        epToFocus.focus();
                        epToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                case 'Enter':
                    // Allow default button click behavior
                    return;
            }
            return;
        }

        // Default: focus video player on any arrow key if nothing focused
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            video.focus();
            return;
        }
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
