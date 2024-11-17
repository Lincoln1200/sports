// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Handle PWA installation
let deferredPrompt;
const installButton = document.createElement('button');
installButton.style.display = 'none';
installButton.className = 'install-button';
installButton.textContent = 'Install App';

// Show install button when PWA is available
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
    
    // Add button to header
    const header = document.querySelector('header .container');
    header.appendChild(installButton);
});

// Handle install button click
installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
        installButton.style.display = 'none';
    }
});

// Hide button after installation
window.addEventListener('appinstalled', () => {
    installButton.style.display = 'none';
    deferredPrompt = null;
});
