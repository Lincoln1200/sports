// Initialize Socket.io connection
const socket = io({ reconnectionDelay: 1000, reconnectionAttempts: 10 });

// Cache DOM elements
const elements = {
    matchesContainer: document.getElementById('matches-container'),
    matchTemplate: document.getElementById('match-template'),
    loadingState: document.getElementById('loading-state'),
    noMatches: document.getElementById('no-matches'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    connectionStatus: document.getElementById('connection-status')
};

// Current filter and matches data
let currentSport = 'all';
let currentMatches = {};

// Sport icons mapping
const sportIcons = {
    'Soccer': 'fas fa-futbol',
    'Basketball': 'fas fa-basketball-ball',
    'Baseball': 'fas fa-baseball-ball',
    'Ice Hockey': 'fas fa-hockey-puck',
    'American Football': 'fas fa-football-ball'
};

// Create DocumentFragment for better performance
const fragment = document.createDocumentFragment();

// Function to format date and time
const formatDateTime = (() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    return (dateTimeStr) => formatter.format(new Date(dateTimeStr));
})();

// Function to update a single match card
function updateMatchCard(match) {
    const card = elements.matchTemplate.content.cloneNode(true);
    
    // Set data attributes
    const cardElement = card.querySelector('.match-card');
    cardElement.dataset.matchId = match.id;
    cardElement.dataset.sport = match.sport;
    
    // Update header
    const header = card.querySelector('.match-header');
    header.querySelector('.league').textContent = match.league;
    header.querySelector('.sport-icon').innerHTML = `<i class="${sportIcons[match.sport] || 'fas fa-globe'}"></i>`;
    
    // Update team info
    const homeTeam = card.querySelector('.home-team');
    const awayTeam = card.querySelector('.away-team');
    
    homeTeam.querySelector('.team-logo').src = match.homeLogo;
    homeTeam.querySelector('.team-logo').alt = match.homeTeam;
    homeTeam.querySelector('.team-name').textContent = match.homeTeam;
    
    awayTeam.querySelector('.team-logo').src = match.awayLogo;
    awayTeam.querySelector('.team-logo').alt = match.awayTeam;
    awayTeam.querySelector('.team-name').textContent = match.awayTeam;
    
    // Update scores
    card.querySelector('.home-score').textContent = match.homeScore;
    card.querySelector('.away-score').textContent = match.awayScore;
    
    // Update match info
    const statusElement = card.querySelector('.status');
    statusElement.textContent = match.status;
    statusElement.className = `status ${match.status.toLowerCase().replace(/\s+/g, '-')}`;
    
    if (match.elapsed) {
        card.querySelector('.elapsed').textContent = `${match.elapsed}'`;
    }
    
    if (match.venue) {
        card.querySelector('.venue').textContent = match.venue;
    }
    
    if (match.datetime) {
        card.querySelector('.datetime').textContent = formatDateTime(match.datetime);
    }
    
    return cardElement;
}

// Function to update the matches display
function updateMatchesDisplay(groupedMatches) {
    // Store current matches
    currentMatches = groupedMatches;
    
    // Hide loading state
    elements.loadingState.style.display = 'none';
    
    // Clear existing match cards
    while (elements.matchesContainer.firstChild) {
        if (!elements.matchesContainer.firstChild.classList?.contains('loading-state') && 
            !elements.matchesContainer.firstChild.classList?.contains('no-matches')) {
            elements.matchesContainer.removeChild(elements.matchesContainer.firstChild);
        }
    }
    
    // Filter and sort matches
    let matches = [];
    if (currentSport === 'all') {
        matches = Object.values(groupedMatches).flat();
    } else {
        matches = groupedMatches[currentSport] || [];
    }
    
    if (!matches || matches.length === 0) {
        elements.noMatches.style.display = 'block';
        return;
    }
    
    elements.noMatches.style.display = 'none';
    
    // Sort matches: Live matches first, then by date
    matches.sort((a, b) => {
        if (a.status === 'Live' && b.status !== 'Live') return -1;
        if (a.status !== 'Live' && b.status === 'Live') return 1;
        return new Date(a.datetime) - new Date(b.datetime);
    });
    
    // Use DocumentFragment for better performance
    matches.forEach(match => {
        fragment.appendChild(updateMatchCard(match));
    });
    
    elements.matchesContainer.appendChild(fragment);
}

// Handle sport filter clicks
elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        elements.filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentSport = button.dataset.sport;
        
        // Update display with cached data
        if (Object.keys(currentMatches).length > 0) {
            updateMatchesDisplay(currentMatches);
        }
    });
});

// Socket event handlers
socket.on('updateMatches', updateMatchesDisplay);

socket.on('connect', () => {
    console.log('Connected to server');
    elements.connectionStatus.textContent = 'Connected';
    elements.connectionStatus.className = 'connected';
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    elements.connectionStatus.textContent = 'Disconnected';
    elements.connectionStatus.className = 'disconnected';
});