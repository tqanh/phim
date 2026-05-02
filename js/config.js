// API Configuration
export const API_BASE = 'https://ophim1.com';

// Storage keys
export const STORAGE_KEY = 'phimTV_watchProgress';
export const CONTINUE_WATCHING_KEY = 'phimTV_continueWatching';
export const FAVORITES_KEY = 'phimTV_favorites';

// Focusable selectors for navigation
export const focusableSelectors = '.nav-item, .movie-item, .modal-close, .search-input, .load-more-btn, .episode-item';

// State (will be managed by state.js or main.js)
export let movies = [];
export let focusedElement = null;
export let currentSection = 'movies'; // 'movies' or 'series'
export let currentFilter = 'movies'; // 'movies' or 'series'
export let currentMovieSlug = null;
export let currentEpisodeId = null;
export let currentPage = 1;
export let isSearching = false;
export let searchQuery = '';
export let allMovies = [];

// Track last movie index before navigating to loadMoreBtn
export let lastMovieIndexBeforeLoadMore = -1;

// Video player variables
export let hls = null;
export let currentVideoUrl = null;
export let currentMovieInfo = null;

// Episode list state
export let currentEpisodes = []; // All episodes for current movie
export let currentEpisodeIndex = 0; // Current episode position
export let hasMultipleEpisodes = false; // Whether movie has multiple episodes

// Export state setters
export function setMovies(newMovies) { movies = newMovies; }
export function appendMovies(newMovies) { movies = [...movies, ...newMovies]; }
export function setFocusedElement(el) { focusedElement = el; }
export function setCurrentSection(section) { currentSection = section; }
export function setCurrentFilter(filter) { currentFilter = filter; }
export function setCurrentMovieSlug(slug) { currentMovieSlug = slug; }
export function setCurrentEpisodeId(id) { currentEpisodeId = id; }
export function setCurrentPage(page) { currentPage = page; }
export function setIsSearching(searching) { isSearching = searching; }
export function setSearchQuery(query) { searchQuery = query; }
export function setAllMovies(newMovies) { allMovies = newMovies; }
export function appendAllMovies(newMovies) { allMovies = [...allMovies, ...newMovies]; }
export function setLastMovieIndexBeforeLoadMore(index) { lastMovieIndexBeforeLoadMore = index; }
export function setHls(newHls) { hls = newHls; }
export function setCurrentVideoUrl(url) { currentVideoUrl = url; }
export function setCurrentMovieInfo(info) { currentMovieInfo = info; }
export function setCurrentEpisodes(episodes) { currentEpisodes = episodes; }
export function setCurrentEpisodeIndex(index) { currentEpisodeIndex = index; }
export function setHasMultipleEpisodes(value) { hasMultipleEpisodes = value; }
