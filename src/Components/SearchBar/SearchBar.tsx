import React, { useState } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlerRequest } from '../../modal/CrawlerRequest';
import './SearchBar.css';

/**
 * SearchBar component for initiating a crawl and searching content.
 */
const SearchBar: React.FC<{ onCrawlStarted: (crawlId: string) => void; onSearch: (results: string[]) => void }> = ({ onCrawlStarted, onSearch }) => {
    const [url, setUrl] = useState('');
    const [maxDistance, setMaxDistance] = useState(2);
    const [maxSeconds, setMaxSeconds] = useState(60);
    const [maxUrls, setMaxUrls] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');

    const handleCrawl = async () => {
        setError('');
        const request: CrawlerRequest = { url, maxDistance, maxSeconds, maxUrls };
        try {
            const response = await axios.post(globals.api.crawl, request);
            onCrawlStarted(response.data);
        } catch (err) {
            setError('Failed to start crawl. Please check the URL and try again.');
        }
    };

    const handleSearch = async () => {
        setError('');
        try {
            const response = await axios.get(globals.api.search, { params: { query: searchQuery } });
            onSearch(response.data);
        } catch (err) {
            setError('Failed to fetch search results. Please try again.');
        }
    };

    return (
        <div className="search-bar-container">
            <h2>Search Engine</h2>
            <div className="crawl-form">
                <input
                    type="text"
                    placeholder="Enter URL to crawl (e.g., example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Max Distance"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                />
                <input
                    type="number"
                    placeholder="Max Seconds"
                    value={maxSeconds}
                    onChange={(e) => setMaxSeconds(Number(e.target.value))}
                />
                <input
                    type="number"
                    placeholder="Max URLs"
                    value={maxUrls}
                    onChange={(e) => setMaxUrls(Number(e.target.value))}
                />
                <button onClick={handleCrawl}>Start Crawl</button>
            </div>
            <div className="search-form">
                <input
                    type="text"
                    placeholder="Enter search query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SearchBar;