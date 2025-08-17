import React, { useState } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlerRequest } from '../../modal/CrawlerRequest';
import './SearchBar.css';

interface Props {
    onCrawlStarted: (id: string, maxSeconds: number | null) => void;
    onSearch: (results: any[], performed: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ onCrawlStarted, onSearch }) => {
    const [url, setUrl] = useState('');
    const [maxDistance, setMaxDistance] = useState('');
    const [maxSeconds, setMaxSeconds] = useState('');
    const [maxUrls, setMaxUrls] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');

    const handleCrawl = async () => {
        setError('');
        if (!url.trim()) {
            setError('Please enter a URL to crawl.');
            return;
        }
        const request: CrawlerRequest = {
            url: url.trim(),
            maxDistance: maxDistance ? Number(maxDistance) : 2,
            maxSeconds: maxSeconds ? Number(maxSeconds) : 60,
            maxUrls: maxUrls ? Number(maxUrls) : 1000,
        };
        try {
            const response = await axios.post(globals.api.crawl, request, { responseType: 'text' });
            const id = response.data;
            onCrawlStarted(id, request.maxSeconds);
        } catch (err) {
            console.error(err);
            setError('Failed to start crawl. Please check the URL and try again.');
        }
    };

    const handleSearch = async () => {
        setError('');
        if (!searchQuery.trim()) {
            // do not call search API if empty; show nothing
            onSearch([], false);
            return;
        }
        try {
            const response = await axios.get(globals.api.search, { params: { query: searchQuery.trim() } });
            onSearch(response.data || [], true);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch search results. Please try again.');
            onSearch([], true);
        }
    };

    const onCrawlKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleCrawl();
    };

    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="search-bar-container">
            <div className="crawl-form">
                <input
                    type="text"
                    placeholder="Enter a website URL (e.g., ynet.co.il)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={onCrawlKey}
                />
                <input
                    type="number"
                    placeholder="Max crawl depth"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    onKeyDown={onCrawlKey}
                />
                <input
                    type="number"
                    placeholder="Max seconds"
                    value={maxSeconds}
                    onChange={(e) => setMaxSeconds(e.target.value)}
                    onKeyDown={onCrawlKey}
                />
                <input
                    type="number"
                    placeholder="Max URLs"
                    value={maxUrls}
                    onChange={(e) => setMaxUrls(e.target.value)}
                    onKeyDown={onCrawlKey}
                />
                <button onClick={handleCrawl}>Start Crawl</button>
            </div>

            <div className="search-form">
                <input
                    type="text"
                    placeholder="Enter a keyword to search (e.g., news)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={onSearchKey}
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SearchBar;
