const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const axios = require('axios');

app.use(express.static(path.join(__dirname)));

// Cache for storing match data
let matchesCache = {};
let lastFetchTime = {};

// Function to fetch matches for a single sport
async function fetchSportMatches(sport, endpoint) {
    try {
        // Check if we need to fetch new data (cache for 10 seconds)
        const now = Date.now();
        if (matchesCache[sport] && lastFetchTime[sport] && (now - lastFetchTime[sport] < 10000)) {
            return matchesCache[sport];
        }

        const response = await axios.get(endpoint);
        const matches = response.data.events || [];
        
        // Update cache
        matchesCache[sport] = matches;
        lastFetchTime[sport] = now;
        
        return matches;
    } catch (error) {
        console.error(`Error fetching ${sport} matches:`, error.message);
        return matchesCache[sport] || []; // Return cached data if available
    }
}

// Function to fetch live matches from TheSportsDB
async function fetchLiveMatches() {
    try {
        // Fetch all sports in parallel
        const [soccer, basketball, baseball, hockey, football] = await Promise.all([
            fetchSportMatches('Soccer', 'https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Soccer'),
            fetchSportMatches('Basketball', 'https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Basketball'),
            fetchSportMatches('Baseball', 'https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Baseball'),
            fetchSportMatches('Ice Hockey', 'https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Ice Hockey'),
            fetchSportMatches('American Football', 'https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=American Football')
        ]);

        // Format matches
        const formatMatch = (match, sport) => ({
            id: match.idEvent,
            homeTeam: match.strHomeTeam,
            awayTeam: match.strAwayTeam,
            homeScore: match.intHomeScore || '0',
            awayScore: match.intAwayScore || '0',
            status: match.strStatus || 'Live',
            league: match.strLeague,
            sport: sport,
            elapsed: match.strProgress || '',
            datetime: match.strTimestamp || match.dateEvent + ' ' + (match.strTime || ''),
            venue: match.strVenue,
            homeLogo: match.strHomeTeamBadge,
            awayLogo: match.strAwayTeamBadge
        });

        // Group matches by sport
        const groupedMatches = {
            Soccer: soccer.map(match => formatMatch(match, 'Soccer')),
            Basketball: basketball.map(match => formatMatch(match, 'Basketball')),
            Baseball: baseball.map(match => formatMatch(match, 'Baseball')),
            'Ice Hockey': hockey.map(match => formatMatch(match, 'Ice Hockey')),
            'American Football': football.map(match => formatMatch(match, 'American Football'))
        };

        return groupedMatches;
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        return matchesCache; // Return cached data if available
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection handling
io.on('connection', async (socket) => {
    console.log('A user connected');
    
    // Send initial data to client
    const initialMatches = await fetchLiveMatches();
    socket.emit('updateMatches', initialMatches);

    // Update matches every 10 seconds
    const updateInterval = setInterval(async () => {
        const matches = await fetchLiveMatches();
        io.emit('updateMatches', matches);
    }, 10000);

    // Handle sport filter requests
    socket.on('filterSport', (sport) => {
        socket.sport = sport;
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(updateInterval);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
