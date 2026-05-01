import { focusableSelectors, setLastMovieIndexBeforeLoadMore, lastMovieIndexBeforeLoadMore } from './config.js';

// Scroll element into view with offset for TV display
export function scrollIntoView(element) {
    if (element.classList.contains('movie-item')) {
        // Determine which row the element is in
        const continueRow = document.getElementById('continueRow');
        const movieRow = document.getElementById('movieRow');
        const currentRow = (continueRow && continueRow.contains(element)) ? continueRow : movieRow;
        
        if (currentRow) {
            const elementRect = element.getBoundingClientRect();
            const rowRect = currentRow.getBoundingClientRect();
            
            // Calculate scroll position to center the element
            const scrollLeft = element.offsetLeft - (rowRect.width / 2) + (element.offsetWidth / 2);
            
            currentRow.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
        
        // Also ensure vertical visibility
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Navigate Horizontally (Left/Right)
export function navigateHorizontal(direction) {
    const activeElement = document.activeElement;
    const allFocusable = Array.from(document.querySelectorAll(focusableSelectors));
    const currentIndex = allFocusable.indexOf(activeElement);
    
    if (currentIndex === -1) {
        // No focus yet, focus first element
        const first = allFocusable[0];
        if (first) {
            first.focus();
            scrollIntoView(first);
        }
        return;
    }

    let nextElement = null;

    if (activeElement.classList.contains('movie-item')) {
        // Navigate within movie row
        const continueRow = document.getElementById('continueRow');
        const movieRow = document.getElementById('movieRow');
        
        // Determine which row the active element is in
        const currentRow = (continueRow && continueRow.contains(activeElement)) ? continueRow : movieRow;
        const movies = Array.from(currentRow.querySelectorAll('.movie-item'));
        const movieIndex = movies.indexOf(activeElement);
        
        if (direction === 'right' && movieIndex < movies.length - 1) {
            nextElement = movies[movieIndex + 1];
        } else if (direction === 'right' && movieIndex === movies.length - 1) {
            // At last movie, move to load more button (only for movieRow)
            if (currentRow === movieRow) {
                const loadMoreBtn = document.getElementById('loadMoreBtn');
                if (loadMoreBtn) {
                    // Save current movie index before moving to button
                    setLastMovieIndexBeforeLoadMore(movieIndex);
                    nextElement = loadMoreBtn;
                }
            }
        } else if (direction === 'left' && movieIndex > 0) {
            nextElement = movies[movieIndex - 1];
        }
    } else if (activeElement.classList.contains('nav-item')) {
        // Navigate between nav items
        const navItems = Array.from(document.querySelectorAll('.nav-item'));
        const navIndex = navItems.indexOf(activeElement);
        
        if (direction === 'right' && navIndex < navItems.length - 1) {
            nextElement = navItems[navIndex + 1];
        } else if (direction === 'left' && navIndex > 0) {
            nextElement = navItems[navIndex - 1];
        } else if (direction === 'down') {
            // Move to first movie
            const firstMovie = document.querySelector('.movie-item');
            if (firstMovie) nextElement = firstMovie;
        }
    } else if (activeElement.id === 'searchInput') {
        // Navigate from search input
        if (direction === 'left') {
            const navItems = Array.from(document.querySelectorAll('.nav-item'));
            if (navItems.length > 0) nextElement = navItems[navItems.length - 1];
        } else if (direction === 'down') {
            const firstMovie = document.querySelector('.movie-item');
            if (firstMovie) nextElement = firstMovie;
        }
    } else if (activeElement.id === 'loadMoreBtn') {
        // Navigate from load more button
        if (direction === 'left') {
            const movieRow = document.getElementById('movieRow');
            if (movieRow) {
                const movies = Array.from(movieRow.querySelectorAll('.movie-item'));
                if (movies.length > 0) {
                    // Use saved index if valid, otherwise fallback to last movie
                    if (lastMovieIndexBeforeLoadMore >= 0 && lastMovieIndexBeforeLoadMore < movies.length) {
                        nextElement = movies[lastMovieIndexBeforeLoadMore];
                    } else {
                        nextElement = movies[movies.length - 1];
                    }
                }
            }
        }
    }

    if (nextElement) {
        nextElement.focus();
        scrollIntoView(nextElement);
    }
}

// Navigate Vertically (Up/Down) - 2D Grid Navigation
export function navigateVertical(direction) {
    const activeElement = document.activeElement;
    
    let nextElement = null;

    if (activeElement.classList.contains('nav-item')) {
        if (direction === 'down') {
            // Move to first movie
            const firstMovie = document.querySelector('.movie-item');
            if (firstMovie) nextElement = firstMovie;
        }
    } else if (activeElement.id === 'searchInput') {
        if (direction === 'down') {
            // Move to first movie
            const firstMovie = document.querySelector('.movie-item');
            if (firstMovie) nextElement = firstMovie;
        }
    } else if (activeElement.classList.contains('movie-item')) {
        const continueRow = document.getElementById('continueRow');
        const movieRow = document.getElementById('movieRow');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        // Get current column index
        const currentRow = continueRow && continueRow.contains(activeElement) ? continueRow : movieRow;
        const movies = Array.from(currentRow.querySelectorAll('.movie-item'));
        const currentIndex = movies.indexOf(activeElement);
        
        if (direction === 'up') {
            // If in new movies section
            if (movieRow && movieRow.contains(activeElement)) {
                if (continueRow) {
                    const continueMovies = Array.from(continueRow.querySelectorAll('.movie-item'));
                    if (continueMovies.length > 0) {
                        // Try to find movie at same column index
                        if (currentIndex < continueMovies.length) {
                            nextElement = continueMovies[currentIndex];
                        } else {
                            // If continue row is shorter, focus last movie
                            nextElement = continueMovies[continueMovies.length - 1];
                        }
                    } else {
                        // No continue watching movies, move to nav
                        const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
                        if (activeNav) nextElement = activeNav;
                    }
                } else {
                    // No continue watching section, move to nav
                    const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
                    if (activeNav) nextElement = activeNav;
                }
            }
            // If in continue watching section, move to nav (any movie position)
            else if (continueRow && continueRow.contains(activeElement)) {
                const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
                if (activeNav) nextElement = activeNav;
            }
        } else if (direction === 'down') {
            // If in continue watching section, move to new movies at same column
            if (continueRow && continueRow.contains(activeElement) && movieRow) {
                const newMovies = Array.from(movieRow.querySelectorAll('.movie-item'));
                if (newMovies.length > 0) {
                    // Try to find movie at same column index
                    if (currentIndex < newMovies.length) {
                        nextElement = newMovies[currentIndex];
                    } else {
                        // If new movies row is shorter, focus last movie
                        nextElement = newMovies[newMovies.length - 1];
                    }
                }
            }
            // If in new movies section, move to load more button
            else if (movieRow && movieRow.contains(activeElement) && loadMoreBtn) {
                // Save current movie index before moving to button
                setLastMovieIndexBeforeLoadMore(currentIndex);
                nextElement = loadMoreBtn;
            }
        }
    } else if (activeElement.id === 'loadMoreBtn') {
        const movieRow = document.getElementById('movieRow');
        if (direction === 'up' && movieRow) {
            // Move back to the movie that was focused before coming to button
            const movies = Array.from(movieRow.querySelectorAll('.movie-item'));
            if (movies.length > 0) {
                // Use saved index if valid, otherwise fallback to last movie
                if (lastMovieIndexBeforeLoadMore >= 0 && lastMovieIndexBeforeLoadMore < movies.length) {
                    nextElement = movies[lastMovieIndexBeforeLoadMore];
                } else {
                    nextElement = movies[movies.length - 1];
                }
            }
        }
    }

    if (nextElement) {
        nextElement.focus();
        scrollIntoView(nextElement);
    }
}
