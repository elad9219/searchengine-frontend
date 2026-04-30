import React, { useState, useEffect } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import CrawlStatusComponent from '../CrawlStatusComponent/CrawlStatusComponent';
import SearchResults from '../SearchResults/SearchResults';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import './MainComponent.css';
import { SearchResult } from '../../modal/SearchResult';
import axiosInstance from '../../utils/axiosInstance';
import globals from '../../utils/globals';

const MainComponent: React.FC = () => {
    const [crawlId, setCrawlId] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [currentMaxSeconds, setCurrentMaxSeconds] = useState<number>(60);
    const [openHelp, setOpenHelp] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    
    // Cold start state
    const [isWakingUp, setIsWakingUp] = useState(false);

    // Listeners for cold start events
    useEffect(() => {
        const handleWakeUp = () => setIsWakingUp(true);
        const handleAwake = () => setIsWakingUp(false);

        window.addEventListener('serverWakingUp', handleWakeUp);
        window.addEventListener('serverAwake', handleAwake);

        return () => {
            window.removeEventListener('serverWakingUp', handleWakeUp);
            window.removeEventListener('serverAwake', handleAwake);
        };
    }, []);

    const handleCrawlStarted = (id: string, maxSeconds: number | null) => {
        setCrawlId(id || '');
        setSearchResults([]);
        setSearchPerformed(false);
        setCurrentMaxSeconds(maxSeconds ?? 60);
        setIsStopped(false);
    };

    const handleSearch = (results: SearchResult[], performed: boolean) => {
        setSearchResults(results);
        setSearchPerformed(performed);
    };

    const handleOpenHelp = () => setOpenHelp(true);
    const handleCloseHelp = () => setOpenHelp(false);

    const handleStopCrawl = async () => {
        if (crawlId && !isStopped) {
            try {
                await axiosInstance.post(`${globals.api.getCrawlStatus}/${crawlId}/stop`);
                setIsStopped(true);
            } catch (error) {
                console.error('Failed to stop crawl:', error);
            }
        }
    };

    return (
        <div className="main-component-container">
            <h1>Web Search Engine</h1>
            
            {isWakingUp && (
                <div className="waking-up-msg">
                    ⏳ The free server is waking up (this may take ~30 seconds), please wait...
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
                    disabled={isWakingUp}
                >
                    Help
                </Button>
            </div>
            <Dialog open={openHelp} onClose={handleCloseHelp}>
                <DialogTitle sx={{ textAlign: 'center' }}>How to Use the Web Search Engine</DialogTitle>
            <DialogContent sx={{ padding: '24px' }}>
                <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                    Follow these steps to crawl a website and search for content:
                </p>
                <ol style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                    <li><strong>Start Crawling:</strong> Enter a website URL (e.g., ynet.co.il) and set max seconds (1-9999, default: 60) to limit crawl duration.
                        <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                            <li>Click "Advanced" to optionally set max crawl depth (1-99) and max URLs (1-99999999).</li>
                        </ul>
                        Click "Start Crawl" to begin.
                    </li>
                    <li><strong>Search Content:</strong> After crawling, enter a keyword (e.g., news) in the search field and click "Search" to find matching pages.</li>
                    <li><strong>View Results:</strong> See the crawl status and search results below.</li>
                    <li><strong>Stop Crawl:</strong> Click the stop icon (⏹️) to halt an active crawl if needed.</li>
                </ol>
                <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                    Tip: Click on any input field to see recent values you used.
                </p>
            </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHelp}>Close</Button>
                </DialogActions>
            </Dialog>
            <SearchBar onCrawlStarted={handleCrawlStarted} onSearch={handleSearch} disabled={isWakingUp} />
            {crawlId ? <CrawlStatusComponent key={crawlId} crawlId={crawlId} maxSeconds={currentMaxSeconds} onStop={handleStopCrawl} /> : null}
            <SearchResults results={searchResults} searchPerformed={searchPerformed} />
        </div>
    );
};

export default MainComponent;