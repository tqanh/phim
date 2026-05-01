import { loadWatchProgress, saveWatchProgress } from './storage.js';
import { formatTime } from './api.js';
import { 
    setHls, setCurrentVideoUrl, setCurrentMovieSlug, setCurrentEpisodeId, setCurrentMovieInfo,
    setCurrentEpisodes, setCurrentEpisodeIndex, setHasMultipleEpisodes,
    hls, currentMovieSlug, currentEpisodeId, currentMovieInfo,
    currentEpisodes, currentEpisodeIndex, hasMultipleEpisodes
} from './config.js';

let volumeTimeout = null;

// Show volume indicator
function showVolumeIndicator(volume) {
    const indicator = document.getElementById('volumeIndicator');
    const percentage = Math.round(volume * 100);
    indicator.textContent = `Âm lượng: ${percentage}%`;
    indicator.classList.add('show');
    
    clearTimeout(volumeTimeout);
    volumeTimeout = setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Show resume notification
function showResumeNotification(currentTime) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const notification = document.createElement('div');
    notification.className = 'resume-notification';
    notification.innerHTML = `
        <div class="resume-content">
            <span>▶ Tiếp tục xem từ ${timeStr}</span>
        </div>
    `;
    document.querySelector('.video-container')?.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Open Modal with Video Player
export function openModal(videoUrl, movieName, slug, episodeId, episodes = [], startIndex = 0) {
    const modal = document.getElementById('modalOverlay');
    const video = document.getElementById('videoPlayer');
    const closeBtn = document.getElementById('modalClose');
    const episodePanel = document.getElementById('episodePanel');
    
    setCurrentVideoUrl(videoUrl);
    setCurrentMovieSlug(slug);
    setCurrentEpisodeId(episodeId);
    setCurrentEpisodes(episodes);
    setCurrentEpisodeIndex(startIndex);
    setHasMultipleEpisodes(episodes.length > 1);
    
    modal.classList.add('active');
    
    // Show/hide episode panel based on number of episodes
    if (episodePanel) {
        episodePanel.style.display = episodes.length > 1 ? 'flex' : 'none';
    }
    
    // Render episode list
    renderEpisodeList(episodes, startIndex, slug);
    
    // Setup video player with resume support
    setupVideoPlayer(videoUrl, movieName, slug, episodeId);
    
    // Setup episode navigation buttons
    setupEpisodeNavigation();
    
    // Focus close button initially
    setTimeout(() => closeBtn.focus(), 100);
}

// Close Modal
export function closeModal() {
    const modal = document.getElementById('modalOverlay');
    const video = document.getElementById('videoPlayer');
    
    // Stop video
    video.pause();
    video.src = '';
    
    // Destroy HLS instance
    if (hls) {
        hls.destroy();
        setHls(null);
    }
    
    // Exit fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen?.();
    }
    
    modal.classList.remove('active');
    
    // Return focus to last focused movie
    const lastMovie = document.querySelector('.movie-item:focus') || 
                     document.querySelector(`[data-slug]`);
    if (lastMovie) {
        lastMovie.focus();
    }
}

// Render Episode List
function renderEpisodeList(episodes, activeIndex, slug) {
    const episodeList = document.getElementById('episodeList');
    if (!episodeList) return;
    
    episodeList.innerHTML = episodes.map((ep, index) => {
        const isActive = index === activeIndex;
        const progress = loadWatchProgress(slug, ep.slug || `ep${index + 1}`);
        const progressText = progress > 60 ? ` (${Math.round(progress / 60)}ph)` : '';
        
        return `
            <div class="episode-item ${isActive ? 'active' : ''}" 
                 tabindex="0" 
                 data-episode-index="${index}"
                 data-episode-slug="${ep.slug || `ep${index + 1}`}">
                <span class="episode-number">Tập ${index + 1}</span>
                <span class="episode-name">${ep.name || ''}</span>
                ${progressText ? `<span class="episode-progress">${progressText}</span>` : ''}
            </div>
        `;
    }).join('');
    
    // Add click and keyboard handlers to episode items
    const items = episodeList.querySelectorAll('.episode-item');
    items.forEach((item, index) => {
        item.addEventListener('click', () => playEpisode(index));
        item.addEventListener('keydown', (e) => {
            const currentIndex = parseInt(item.dataset.episodeIndex);
            
            switch(e.key) {
                case 'Enter':
                    e.preventDefault();
                    playEpisode(index);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    // Focus previous episode
                    if (currentIndex > 0) {
                        items[currentIndex - 1].focus();
                        items[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    // Focus next episode
                    if (currentIndex < items.length - 1) {
                        items[currentIndex + 1].focus();
                        items[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    e.stopPropagation();
                    // Go back to control buttons
                    const firstControlBtn = document.querySelector('.control-btn');
                    if (firstControlBtn) firstControlBtn.focus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    // Go back to control buttons
                    const controlBtn = document.querySelector('.control-btn');
                    if (controlBtn) controlBtn.focus();
                    break;
                case 'Backspace':
                case 'Escape':
                    e.preventDefault();
                    // Close modal
                    closeModal();
                    break;
            }
        });
    });
    
    // Scroll active episode into view
    const activeItem = episodeList.querySelector('.episode-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Play specific episode
export function playEpisode(index) {
    if (index < 0 || index >= currentEpisodes.length) return;
    
    const episode = currentEpisodes[index];
    const videoUrl = episode.link_m3u8 || episode.link_embed;
    const episodeSlug = episode.slug || `ep${index + 1}`;
    
    if (!videoUrl) {
        alert('Không tìm thấy link tập này!');
        return;
    }
    
    // Update state
    setCurrentEpisodeIndex(index);
    setCurrentEpisodeId(episodeSlug);
    setCurrentVideoUrl(videoUrl);
    
    // Re-render episode list to update active state
    renderEpisodeList(currentEpisodes, index, currentMovieSlug);
    
    // Reload video player with new episode
    const video = document.getElementById('videoPlayer');
    const movieName = currentMovieInfo?.name || 'Phim';
    
    // Stop current playback
    video.pause();
    if (hls) {
        hls.destroy();
        setHls(null);
    }
    
    // Setup new video
    setupVideoPlayer(videoUrl, movieName, currentMovieSlug, episodeSlug);
    
    // Focus video player
    setTimeout(() => video.focus(), 100);
}

// Navigate to next episode
export function nextEpisode() {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
    }
}

// Navigate to previous episode
export function prevEpisode() {
    if (currentEpisodeIndex > 0) {
        playEpisode(currentEpisodeIndex - 1);
    }
}

// Setup episode navigation buttons
function setupEpisodeNavigation() {
    const prevBtn = document.getElementById('prevEpisodeBtn');
    const nextBtn = document.getElementById('nextEpisodeBtn');
    
    if (prevBtn) {
        prevBtn.onclick = () => prevEpisode();
        prevBtn.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                prevEpisode();
            }
        };
        // Disable if at first episode
        prevBtn.disabled = currentEpisodeIndex === 0;
        prevBtn.style.opacity = currentEpisodeIndex === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => nextEpisode();
        nextBtn.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nextEpisode();
            }
        };
        // Disable if at last episode
        nextBtn.disabled = currentEpisodeIndex === currentEpisodes.length - 1;
        nextBtn.style.opacity = currentEpisodeIndex === currentEpisodes.length - 1 ? '0.5' : '1';
    }
}

// Setup Video Player with HLS support and resume playback
function setupVideoPlayer(videoUrl, movieName, slug, episodeId) {
    const video = document.getElementById('videoPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const seekBackBtn = document.getElementById('seekBackBtn');
    const seekForwardBtn = document.getElementById('seekForwardBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const timeDisplay = document.getElementById('timeDisplay');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const modal = document.querySelector('.modal-content');
    
    // Load saved progress
    const savedTime = loadWatchProgress(slug, episodeId);
    
    // Reset video
    video.pause();
    video.currentTime = 0;
    
    let saveInterval;
    
    // Setup HLS or native playback with resume support
    if (videoUrl.includes('.m3u8') && Hls.isSupported()) {
        // Destroy previous HLS instance
        if (hls) {
            hls.destroy();
        }
        
        const newHls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true
        });
        setHls(newHls);
        
        newHls.loadSource(videoUrl);
        newHls.attachMedia(video);
        
        newHls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Resume from saved position
            if (savedTime > 0) {
                video.currentTime = savedTime;
                showResumeNotification(savedTime);
            }
            video.play().catch(() => {
                // Auto-play blocked, user needs to press play
            });
            updatePlayPauseButton();
        });
        
        newHls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('HLS Error:', data);
            }
        });
    } else {
        // Native playback for non-HLS
        video.src = videoUrl;
        video.load();
        // Resume from saved position
        if (savedTime > 0) {
            video.currentTime = savedTime;
            showResumeNotification(savedTime);
        }
        video.play().catch(() => {
            // Auto-play blocked
        });
    }
    
    // Update time display
    function updateTimeDisplay() {
        const current = formatTime(video.currentTime);
        const duration = formatTime(video.duration || 0);
        timeDisplay.textContent = `${current} / ${duration}`;
        
        // Update progress bar
        const progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
        progressBar.style.width = `${progress}%`;
    }
    
    function updatePlayPauseButton() {
        playPauseBtn.textContent = video.paused ? '⏵ Play' : '⏸ Pause';
    }
    
    video.addEventListener('timeupdate', updateTimeDisplay);
    video.addEventListener('loadedmetadata', updateTimeDisplay);
    video.addEventListener('play', updatePlayPauseButton);
    video.addEventListener('pause', updatePlayPauseButton);
    
    // Save progress every 10 seconds
    saveInterval = setInterval(() => {
        if (!video.paused && video.currentTime > 0 && slug && episodeId) {
            saveWatchProgress(slug, episodeId, video.currentTime, video.duration || 0, currentMovieInfo);
        }
    }, 10000);
    
    // Save on pause
    video.addEventListener('pause', () => {
        if (slug && episodeId) {
            saveWatchProgress(slug, episodeId, video.currentTime, video.duration || 0, currentMovieInfo);
        }
    });
    
    // Play/Pause
    function togglePlayPause() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
        updatePlayPauseButton();
    }
    
    playPauseBtn.onclick = togglePlayPause;
    playPauseBtn.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            togglePlayPause();
        }
    };
    
    // Seek buttons
    function seek(seconds) {
        video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    }
    
    seekBackBtn.onclick = () => seek(-10);
    seekBackBtn.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            seek(-10);
        }
    };
    
    seekForwardBtn.onclick = () => seek(10);
    seekForwardBtn.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            seek(10);
        }
    };
    
    // Fullscreen
    fullscreenBtn.onclick = toggleFullscreen;
    fullscreenBtn.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            toggleFullscreen();
        }
    };
    
    function toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                // Try video first, then modal container
                if (video.requestFullscreen) {
                    video.requestFullscreen().catch(err => {
                        console.log('Video fullscreen failed, trying modal:', err);
                        modal.requestFullscreen?.();
                    });
                } else if (modal.requestFullscreen) {
                    modal.requestFullscreen();
                }
            } else {
                document.exitFullscreen?.();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }
    
    // Progress bar click
    progressContainer.onclick = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };
    
    // Auto-focus video after short delay for TV Box
    setTimeout(() => {
        video.focus();
    }, 500);
    
    // Keyboard controls for video
    video.onkeydown = (e) => {
        switch(e.key) {
            case 'Escape':
            case 'Backspace':
                e.preventDefault();
                clearInterval(saveInterval);
                if (slug && episodeId && video.currentTime > 0) {
                    saveWatchProgress(slug, episodeId, video.currentTime, video.duration || 0, currentMovieInfo);
                }
                closeModal();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                seek(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                // If episode panel exists and has items, focus the active episode
                const episodePanel = document.getElementById('episodePanel');
                const activeEpisode = document.querySelector('.episode-item.active');
                if (episodePanel && episodePanel.style.display !== 'none' && activeEpisode) {
                    activeEpisode.focus();
                } else {
                    seek(10);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                // Focus first control button
                const firstControl = document.querySelector('.control-btn');
                if (firstControl) firstControl.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                // Focus episode panel
                const epPanel = document.getElementById('episodePanel');
                const episodeToFocus = document.querySelector('.episode-item.active') || 
                                       document.querySelector('.episode-item');
                if (epPanel && epPanel.style.display !== 'none' && episodeToFocus) {
                    episodeToFocus.focus();
                    episodeToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'n':
            case 'N':
                e.preventDefault();
                if (hasMultipleEpisodes && currentEpisodeIndex < currentEpisodes.length - 1) {
                    // Save current progress before switching
                    clearInterval(saveInterval);
                    if (slug && episodeId && video.currentTime > 0) {
                        saveWatchProgress(slug, episodeId, video.currentTime, video.duration || 0, currentMovieInfo);
                    }
                    nextEpisode();
                }
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                if (hasMultipleEpisodes && currentEpisodeIndex > 0) {
                    // Save current progress before switching
                    clearInterval(saveInterval);
                    if (slug && episodeId && video.currentTime > 0) {
                        saveWatchProgress(slug, episodeId, video.currentTime, video.duration || 0, currentMovieInfo);
                    }
                    prevEpisode();
                }
                break;
        }
    };
}
