import { STORAGE_KEY, FAVORITES_KEY } from './config.js';

// Save watch progress to localStorage with complete movie info
export function saveWatchProgress(slug, episodeId, currentTime, duration, currentMovieInfo) {
    try {
        const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        progress[`${slug}_${episodeId}`] = {
            slug: slug,
            currentTime: currentTime,
            duration: duration,
            timestamp: Date.now(),
            // Save movie info for continue watching section
            name: currentMovieInfo?.name || '',
            poster_url: currentMovieInfo?.poster_url || currentMovieInfo?.thumb_url || '',
            year: currentMovieInfo?.year || '',
            time: currentMovieInfo?.time || '',
            lang: currentMovieInfo?.lang || '',
            episode_current: currentMovieInfo?.episode_current || '',
            content: currentMovieInfo?.content || ''
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Failed to save watch progress:', e);
    }
}

// Load watch progress from localStorage
export function loadWatchProgress(slug, episodeId) {
    try {
        const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const saved = progress[`${slug}_${episodeId}`];
        if (saved && saved.duration > 0) {
            // Resume if not at the end (within last 2 minutes or 95%)
            const threshold = Math.min(120, saved.duration * 0.05);
            if (saved.currentTime < saved.duration - threshold) {
                return saved.currentTime;
            }
        }
    } catch (e) {
        console.error('Failed to load watch progress:', e);
    }
    return 0;
}

// Get continue watching list
export function getContinueWatching() {
    try {
        const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const watching = [];
        
        for (const [key, value] of Object.entries(progress)) {
            // Only include if watched between 1% and 95% and within last 30 days
            if (value.duration > 0) {
                const percent = (value.currentTime / value.duration) * 100;
                const daysAgo = (Date.now() - (value.timestamp || Date.now())) / (1000 * 60 * 60 * 24);
                
                if (percent > 1 && percent < 95 && daysAgo < 30) {
                    // Check if poster_url already has full path to avoid duplication
                    let posterUrl = value.poster_url || '';
                    if (posterUrl && !posterUrl.startsWith('http')) {
                        posterUrl = 'https://img.ophim.live/uploads/movies/' + posterUrl;
                    }
                    
                    watching.push({
                        slug: value.slug || key,
                        name: value.name || 'Unknown',
                        poster_url: posterUrl,
                        year: value.year || '',
                        time: value.time || '',
                        lang: value.lang || '',
                        episode_current: value.episode_current || '',
                        content: value.content || '',
                        progress: percent,
                        currentTime: value.currentTime,
                        duration: value.duration
                    });
                }
            }
        }
        
        // Sort by most recently watched
        return watching.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
    } catch (e) {
        return [];
    }
}

// Add movie to favorites
export function addToFavorites(movie) {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        // Check if already in favorites
        if (!favorites.find(f => f.slug === movie.slug)) {
            favorites.push({
                slug: movie.slug,
                name: movie.name,
                poster_url: movie.poster_url || movie.thumb_url || '',
                year: movie.year || '',
                time: movie.time || '',
                lang: movie.lang || '',
                episode_current: movie.episode_current || '',
                content: movie.content || '',
                addedAt: Date.now()
            });
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        }
    } catch (e) {
        console.error('Failed to add favorite:', e);
    }
}

// Remove movie from favorites
export function removeFromFavorites(slug) {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        const filtered = favorites.filter(f => f.slug !== slug);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to remove favorite:', e);
    }
}

// Check if movie is in favorites
export function isFavorite(slug) {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        return favorites.some(f => f.slug === slug);
    } catch (e) {
        return false;
    }
}

// Get all favorites
export function getFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        // Sort by most recently added
        return favorites.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    } catch (e) {
        return [];
    }
}
