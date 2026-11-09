import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from '../SearchBar/SearchBar';
import CrawlStatusComponent from '../CrawlStatusComponent/CrawlStatusComponent';
import SearchResults from '../SearchResults/SearchResults';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import './MainComponent.css';
import { SearchResult } from '../../modal/SearchResult';
import { crawlLimits, demoExample } from '../../utils/demoLimits';
import globals from '../../utils/globals';

const MainComponent: React.FC = () => {
    const [crawlId, setCrawlId] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [currentMaxSeconds, setCurrentMaxSeconds] = useState(crawlLimits.seconds.defaultValue);
    const [openHelp, setOpenHelp] = useState(false);

    // Cold start state
    const [isWakingUp, setIsWakingUp] = useState(false);

    useEffect(() => {
        const handleWakeUp = () => setIsWakingUp(true);
        const handleAwake = () => setIsWakingUp(false);

        window.addEventListener('serverWakingUp', handleWakeUp);
        window.addEventListener('serverAwake', handleAwake);

        if (process.env.NODE_ENV === 'production') {
            const healthUrl = new URL('/actuator/health', globals.api.search).toString();
            // Wake the hosted demo without triggering the foreground retry banner.
            void axios.get(healthUrl, { timeout: 10000 }).catch(() => undefined);
        }

        return () => {
            window.removeEventListener('serverWakingUp', handleWakeUp);
            window.removeEventListener('serverAwake', handleAwake);
        };
    }, []);

    const handleCrawlStarted = (id: string, maxSeconds: number | null) => {
        setCrawlId(id || '');
        setSearchResults([]);
        setSearchPerformed(false);
        setCurrentMaxSeconds(maxSeconds ?? crawlLimits.seconds.defaultValue);
    };

    const handleSearch = (results: SearchResult[], performed: boolean) => {
        setSearchResults(results);
        setSearchPerformed(performed);
    };

    const handleOpenHelp = () => setOpenHelp(true);
    const handleCloseHelp = () => setOpenHelp(false);

    return (
        <div className="main-component-container">
            <h1>Web Search Engine</h1>

            {isWakingUp && (
                <div className="waking-up-msg" role="status">
                    Waiting for the demo server to respond. This can take up to 30 seconds.
                </div>
            )}

            <div className="help-button-container">
                <Button
                    variant="contained"
                    startIcon={<HelpOutlineIcon sx={{ fontSize: '18px' }} />}
                    sx={{
                        backgroundColor: '#f57c00',
                        '&:hover': { backgroundColor: '#e66c00' },
                        padding: '4px 10px',
                        fontSize: '13px'
                    }}
                    onClick={handleOpenHelp}
                >
                    Help
                </Button>
            </div>
            <Dialog open={openHelp} onClose={handleCloseHelp} aria-labelledby="demo-help-title">
                <DialogTitle id="demo-help-title">Try the search demo</DialogTitle>
                <DialogContent sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                    <ol>
                        <li>Paste <code>{demoExample.url}</code> into the Website URL field.</li>
                        <li>Click <strong>Start Crawl</strong> and wait for the crawl to finish.</li>
                        <li>Search for <strong>{demoExample.query}</strong> to see a matching page.</li>
                    </ol>
                    <p>Search looks through pages indexed by the demo, including earlier crawls.</p>
                    <p>
                        Leave the crawl settings blank to use {crawlLimits.seconds.defaultValue} seconds,
                        depth {crawlLimits.depth.defaultValue}, and up to {crawlLimits.urls.defaultValue} URLs.
                        Open <strong>Advanced</strong> to change the depth or URL limit.
                        Depth {crawlLimits.depth.min} attempts only the starting page.
                    </p>
                    <p>
                        Use a public website. You can stop an active crawl from its status panel.
                        If the demo reaches its shared start limit, wait a minute before trying again.
                    </p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHelp}>Close</Button>
                </DialogActions>
            </Dialog>
            <SearchBar onCrawlStarted={handleCrawlStarted} onSearch={handleSearch} disabled={isWakingUp} />
            {crawlId ? <CrawlStatusComponent key={crawlId} crawlId={crawlId} maxSeconds={currentMaxSeconds} /> : null}
            <SearchResults results={searchResults} searchPerformed={searchPerformed} />
        </div>
    );
};

export default MainComponent;