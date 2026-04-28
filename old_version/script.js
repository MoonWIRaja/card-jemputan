document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    const startBtn = document.getElementById('start-btn');
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('invitation-video');
    const actionSection = document.getElementById('action-section');
    const acceptBtn = document.getElementById('accept-btn');
    const detailsSection = document.getElementById('details-section');

    // 1. Start Experience (Handle Autoplay Restrictions)
    startBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        
        // Unmute and restart video for cinematic effect
        video.muted = false;
        video.currentTime = 0;
        video.loop = false; // Disable looping for the actual experience
        video.play().catch(error => {
            console.error("Video play failed:", error);
            showActionSection();
        });
    });

    // 2. Detect Video End
    video.addEventListener('ended', () => {
        showActionSection();
    });

    function showActionSection() {
        videoContainer.style.filter = 'blur(10px) brightness(0.3)';
        actionSection.classList.remove('hidden');
    }

    // 3. Handle Acceptance
    acceptBtn.addEventListener('click', () => {
        actionSection.classList.add('hidden');
        videoContainer.classList.add('hidden');
        detailsSection.classList.remove('hidden');
        
        // Bonus: Trigger a haptic-like effect or sound if desired
        console.log("Invitation Accepted by Summoner.");
    });

    // Optional: Add some interactive grit (mouse follow or tilt)
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) / 50;
        const moveY = (e.clientY - window.innerHeight / 2) / 50;
        
        const bentoItems = document.querySelectorAll('.bento-item');
        bentoItems.forEach(item => {
            item.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
});
