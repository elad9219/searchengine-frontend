import React, { useState } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import CrawlStatusComponent from '../CrawlStatusComponent/CrawlStatusComponent';
import SearchResults from '../SearchResults/SearchResults';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import './MainComponent.css';
import { SearchResult } from '../../modal/SearchResult';

const MainComponent: React.FC = () => {
    const [crawlId, setCrawlId] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [currentMaxSeconds, setCurrentMaxSeconds] = useState<number>(60);
    const [openHelp, setOpenHelp] = useState(false);

    const handleCrawlStarted = (id: string, maxSeconds: number | null) => {
        setCrawlId(id || '');
        setSearchResults([]);
        setSearchPerformed(false);
        setCurrentMaxSeconds(maxSeconds ?? 60);
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
            <Dialog open={openHelp} onClose={handleCloseHelp}>
                <DialogTitle sx={{ textAlign: 'center' }}>How to Use the Web Search Engine</DialogTitle>
                <DialogContent sx={{ padding: '24px' }}>
                    <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                        Follow these steps to crawl a website and search for content:
                    </p>
                    <ol style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                        <li><strong>Start Crawling:</strong> Enter a website URL (e.g., ynet.co.il) and set optional parameters:
                            <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                                <li><strong>Max Depth:</strong> How many links deep to crawl (default: 2).</li>
                                <li><strong>Max Seconds:</strong> Maximum time for crawling (default: 60).</li>
                                <li><strong>Max URLs:</strong> Maximum number of pages to crawl (default: 1000).</li>
                            </ul>
                            Click "Start Crawl" to begin.
                        </li>
                        <li><strong>Search Content:</strong> After crawling, enter a keyword (e.g., news) in the search field and click "Search" to find matching pages.</li>
                        <li><strong>View Results:</strong> See the crawl status and search results below.</li>
                    </ol>
                    <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
                        Tip: Click on any input field to see recent values you used.
                    </p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHelp}>Close</Button>
                </DialogActions>
            </Dialog>
            <SearchBar onCrawlStarted={handleCrawlStarted} onSearch={handleSearch} />
            {crawlId ? <CrawlStatusComponent crawlId={crawlId} maxSeconds={currentMaxSeconds} /> : null}
            <SearchResults results={searchResults} searchPerformed={searchPerformed} />
        </div>
    );
};

export default MainComponent;