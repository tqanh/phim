import { API_BASE } from './config.js';

// Fetch movie details by slug
export async function fetchMovieDetails(slug) {
    const response = await fetch(`${API_BASE}/phim/${slug}`);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

// Fetch movies list with pagination
export async function fetchMovies(page = 1, searchQuery = '') {
    const url = searchQuery 
        ? `${API_BASE}/tim-kiem?q=${encodeURIComponent(searchQuery)}&page=${page}`
        : `${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

// Format time helper
export function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
