import React, { useState } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlerRequest } from '../../modal/CrawlerRequest';
import { SearchResult } from '../../modal/SearchResult';
import './SearchBar.css';

interface Props {
    onCrawlStarted: (crawlId: string) => void;
    onSearch: (results: SearchResult[], performed: boolean) => void;
}

const normalizeUrl = (input: string) => {
    if (!input || input.trim() === '') return input;
    let u = input.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'https://' + u;
    }
    try {
        const parsed = new URL(u);
        let host = parsed.host;
        if (!host.startsWith('www.')) {
            host = 'www.' + host;
        }
        const rebuilt = parsed.protocol + '//' + host + (parsed.pathname ?? '') + (parsed.search ?? '') + (parsed.hash ?? '');
        return rebuilt;
    } catch (e) {
        // fallback: best effort
        if (!u.startsWith('https://')) u = 'https://' + u;
        if (!u.includes('www.')) {
            const parts = u.split('://');
            return parts[0] + '://' + 'www.' + parts[1];
        }
        return u;
    }
};

const SearchBar: React.FC<Props> = ({ onCrawlStarted, onSearch }) => {
    const [url, setUrl] = useState('');
    const [maxDistance, setMaxDistance] = useState<'1' | '2' | '3' | ''>('2');
    const [maxSeconds, setMaxSeconds] = useState<string>('');
    const [maxUrls, setMaxUrls] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);
    const [starting, setStarting] = useState(false);

    // Start crawl
    const handleCrawl = async () => {
        setError('');
        if (!url || url.trim() === '') {
            setError('Please enter a URL to crawl.');
            return;
        }
        const normalized = normalizeUrl(url);
        const request: CrawlerRequest = {
            url: normalized,
            maxDistance: maxDistance ? Number(maxDistance) : 2,
            maxSeconds: maxSeconds ? Number(maxSeconds) : 60,
            maxUrls: maxUrls ? Number(maxUrls) : 10,
        };
        setStarting(true);
        try {
            const response = await axios.post(globals.api.crawl, request);
            onCrawlStarted(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to start crawl. Please check the URL and try again.');
        } finally {
            setStarting(false);
        }
    };

    // Search
    const handleSearch = async () => {
        setError('');
        if (!searchQuery || searchQuery.trim() === '') {
            // not performed => don't show "No results found" — frontend will treat performed=false specially
            onSearch([], false);
            return;
        }
        setSearching(true);
        try {
            const response = await axios.get(globals.api.search, { params: { query: searchQuery.trim() } });
            const results: SearchResult[] = response.data.map((r: any) => ({
                url: r.url,
                snippet: r.snippet || null,
            }));
            onSearch(results, true);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch search results. Please try again.');
            onSearch([], true);
        } finally {
            setSearching(false);
        }
    };

    // Handle Enter key on crawl inputs and search input
    const onKeyDownCrawl = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCrawl();
        }
    };
    const onKeyDownSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="search-bar-container">
            {/* Title removed as requested */}
            <div className="crawl-form">
                <input
                    type="text"
                    placeholder="Enter a website (e.g., ynet.co.il)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={onKeyDownCrawl}
                />
                <input
                    type="number"
                    placeholder="Max depth (e.g., 2)"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value as any)}
                    onKeyDown={onKeyDownCrawl}
                    min={1}
                />
                <input
                    type="number"
                    placeholder="Max seconds (e.g., 60)"
                    value={maxSeconds}
                    onChange={(e) => setMaxSeconds(e.target.value)}
                    onKeyDown={onKeyDownCrawl}
                />
                <input
                    type="number"
                    placeholder="Max URLs (e.g., 10)"
                    value={maxUrls}
                    onChange={(e) => setMaxUrls(e.target.value)}
                    onKeyDown={onKeyDownCrawl}
                />
                <button onClick={handleCrawl} disabled={starting}>{starting ? 'Starting...' : 'Start Crawl'}</button>
            </div>
            <div className="search-form">
                <input
                    type="text"
                    placeholder="Search keyword (press Enter or click Search)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={onKeyDownSearch}
                />
                <button onClick={handleSearch} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
            </div>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SearchBar;
