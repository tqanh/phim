import { loadWatchProgress, saveWatchProgress } from './storage.js';
import { formatTime } from './api.js';
import { setHls, setCurrentVideoUrl, setCurrentMovieSlug, setCurrentEpisodeId, setCurrentMovieInfo, hls, currentMovieSlug, currentEpisodeId, currentMovieInfo } from './config.js';

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
export function openModal(videoUrl, movieName, slug, episodeId) {
    const modal = document.getElementById('modalOverlay');
    const video = document.getElementById('videoPlayer');
    const closeBtn = document.getElementById('modalClose');
    
    setCurrentVideoUrl(videoUrl);
    setCurrentMovieSlug(slug);
    setCurrentEpisodeId(episodeId);
    modal.classList.add('active');
    
    // Setup video player with resume support
    setupVideoPlayer(videoUrl, movieName, slug, episodeId);
    
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
                seek(10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                showVolumeIndicator(video.volume);
                break;
            case 'ArrowDown':
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                showVolumeIndicator(video.volume);
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    };
}
