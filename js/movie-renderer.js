import { getContinueWatching, isFavorite, addToFavorites, removeFromFavorites, getFavorites } from './storage.js';
import { isSearching, searchQuery, setCurrentPage } from './config.js';

// Render movie card HTML
export function renderMovieCard(movie, index, pathImage, showFavoriteBtn = true) {
    const progress = movie.progress || 0;
    const hasProgress = progress > 0 && progress < 95;
    const isFav = isFavorite(movie.slug);
    
    return `
        <div class="movie-item" tabindex="0" data-movie-index="${index}" data-slug="${movie.slug}">
            ${showFavoriteBtn ? `
                <button class="favorite-btn ${isFav ? 'is-favorite' : ''}" data-slug="${movie.slug}" tabindex="-1">
                    ${isFav ? '❤️' : '🤍'}
                </button>
            ` : ''}
            <img class="movie-poster" 
                 src="${movie.poster_url ? pathImage + movie.poster_url : movie.thumb_url ? pathImage + movie.thumb_url : 'https://via.placeholder.com/280x420?text=No+Image'}" 
                 alt="${movie.name}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/280x420?text=No+Image'">
            ${movie.quality ? `<span class="movie-quality">${movie.quality}</span>` : ''}
            ${hasProgress ? `
                <div class="continue-badge">Tiếp tục ${Math.round(progress)}%</div>
                <div class="progress-indicator">
                    <div class="progress-indicator-bar" style="width: ${progress}%"></div>
                </div>
            ` : ''}
            <div class="movie-details" aria-hidden="true">
                <div class="movie-details-title">${movie.name}</div>
                <div class="movie-details-meta">
                    ${[movie.year, movie.time, movie.lang, movie.episode_current].filter(Boolean).join(' • ')}
                </div>
                <div class="movie-details-desc">${movie.content || 'Không có mô tả'}</div>
            </div>
        </div>
    `;
}

// Render movies with sections (Favorites + Continue Watching + New Movies)
export function renderMoviesWithSections(moviesList, pathImage, onLoadMore, onMovieClick, currentFilter = 'movies') {
    const mainContent = document.getElementById('mainContent');
    const continueWatching = getContinueWatching();
    const favorites = getFavorites();
    
    let html = '';
    
    // Favorites Section (only show in 'movies' tab and if has favorites)
    if (favorites.length > 0 && currentFilter === 'movies' && !isSearching) {
        html += `
            <section class="section favorites-section">
                <h2 class="section-title">Phim Yêu Thích</h2>
                <div class="movie-row" id="favoritesRow">
                    ${favorites.map((movie, index) => renderMovieCard(movie, index, pathImage)).join('')}
                </div>
            </section>
        `;
    }
    
    // Continue Watching Section (only show in 'movies' tab)
    if (continueWatching.length > 0 && currentFilter === 'movies') {
        html += `
            <section class="section">
                <h2 class="section-title">Tiếp Tục Xem</h2>
                <div class="movie-row" id="continueRow">
                    ${continueWatching.map((movie, index) => renderMovieCard(movie, index, pathImage)).join('')}
                </div>
            </section>
        `;
    }
    
    // New Movies Section - Filter out movies already in continue watching
    const continueWatchingSlugs = new Set(continueWatching.map(m => m.slug));
    const filteredMovies = moviesList.filter(movie => !continueWatchingSlugs.has(movie.slug));
    
    // Set section title based on filter and search state
    let sectionTitle;
    if (isSearching) {
        sectionTitle = `Kết quả tìm kiếm: "${searchQuery}"`;
    } else if (currentFilter === 'series') {
        sectionTitle = 'Phim Bộ Mới Cập Nhật';
    } else if (currentFilter === 'single') {
        sectionTitle = 'Phim Lẻ Mới Cập Nhật';
    } else {
        sectionTitle = 'Phim Mới Cập Nhật';
    }
    
    html += `
        <section class="section">
            <h2 class="section-title">${sectionTitle}</h2>
            <div class="movie-row" id="movieRow">
                ${filteredMovies.map((movie, index) => renderMovieCard(movie, index, pathImage)).join('')}
            </div>
            ${!isSearching ? `
                <div class="load-more-container">
                    <button class="load-more-btn" id="loadMoreBtn" tabindex="0">Tải thêm phim</button>
                </div>
            ` : ''}
        </section>
    `;
    
    mainContent.innerHTML = html;
    
    // Add event handlers
    addMovieEventHandlers(onMovieClick, filteredMovies);
    
    // Load more button handler
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', onLoadMore);
        loadMoreBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onLoadMore();
            }
        });
    }
}

// Append more movies to existing list
export function appendMovies(newMovies, pathImage, onMovieClick) {
    const movieRow = document.getElementById('movieRow');
    
    // Filter out movies already in continue watching
    const continueWatching = getContinueWatching();
    const continueWatchingSlugs = new Set(continueWatching.map(m => m.slug));
    const filteredNewMovies = newMovies.filter(movie => !continueWatchingSlugs.has(movie.slug));
    
    if (filteredNewMovies.length === 0) return;
    
    const startIndex = movieRow.querySelectorAll('.movie-item').length;
    
    const newHtml = filteredNewMovies.map((movie, index) => 
        renderMovieCard(movie, startIndex + index, pathImage)
    ).join('');
    
    movieRow.insertAdjacentHTML('beforeend', newHtml);
    
    // Add event handlers for new items
    addMovieEventHandlers(onMovieClick, filteredNewMovies);
}

// Add event handlers to movie items and favorite buttons
export function addMovieEventHandlers(onMovieClick, moviesList = []) {
    // Movie item click handlers
    document.querySelectorAll('.movie-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking favorite button
            if (e.target.closest('.favorite-btn')) return;
            onMovieClick(item.dataset.slug);
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onMovieClick(item.dataset.slug);
            }
        });
    });
    
    // Favorite button handlers
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slug = btn.dataset.slug;
            const movie = moviesList.find(m => m.slug === slug);
            
            if (isFavorite(slug)) {
                removeFromFavorites(slug);
                btn.innerHTML = '🤍';
                btn.classList.remove('is-favorite');
            } else {
                if (movie) {
                    addToFavorites(movie);
                    btn.innerHTML = '❤️';
                    btn.classList.add('is-favorite');
                }
            }
        });
    });
}

// Show loading state
export function showLoading() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Đang tải phim...</p></div>';
}

// Show error state
export function showError(message, onRetry) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = 
        `<div class="error-message">${message}. <button tabindex="0" id="retryBtn">Thử lại</button></div>`;
    
    document.getElementById('retryBtn')?.addEventListener('click', onRetry);
}

// Clear search and load default movies
export function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
}
