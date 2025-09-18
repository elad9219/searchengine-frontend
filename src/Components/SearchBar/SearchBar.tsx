import React, { useState, useEffect } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlerRequest } from '../../modal/CrawlerRequest';
import { SearchResult } from '../../modal/SearchResult';
import './SearchBar.css';

const HISTORY_KEY_URL = 'crawl_url_history';
const HISTORY_KEY_DISTANCE = 'crawl_distance_history';
const HISTORY_KEY_SECONDS = 'crawl_seconds_history';
const HISTORY_KEY_URLS = 'crawl_urls_history';
const HISTORY_KEY_QUERY = 'search_query_history';
const MAX_HISTORY = 8;

const loadHistory = (key: string): string[] => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
};

const saveHistory = (key: string, value: string, history: string[]) => {
    if (value) {
        const updated = [value, ...history.filter((v) => v !== value)].slice(0, MAX_HISTORY);
        localStorage.setItem(key, JSON.stringify(updated));
    }
};

interface Props {
    onCrawlStarted: (id: string, maxSeconds: number | null) => void;
    onSearch: (results: SearchResult[], performed: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ onCrawlStarted, onSearch }) => {
    const [url, setUrl] = useState('');
    const [maxDistance, setMaxDistance] = useState('');
    const [maxSeconds, setMaxSeconds] = useState('');
    const [maxUrls, setMaxUrls] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [urlHistory, setUrlHistory] = useState<string[]>(loadHistory(HISTORY_KEY_URL));
    const [distanceHistory, setDistanceHistory] = useState<string[]>(loadHistory(HISTORY_KEY_DISTANCE));
    const [secondsHistory, setSecondsHistory] = useState<string[]>(loadHistory(HISTORY_KEY_SECONDS));
    const [urlsHistory, setUrlsHistory] = useState<string[]>(loadHistory(HISTORY_KEY_URLS));
    const [queryHistory, setQueryHistory] = useState<string[]>(loadHistory(HISTORY_KEY_QUERY));

    const handleCrawl = async () => {
        setError('');
        if (!url.trim()) {
            setError('Please enter a URL to crawl.');
            return;
        }
        const request: CrawlerRequest = {
            url: url.trim(),
            maxDistance: maxDistance ? Number(maxDistance) : -1, // -1 for unlimited
            maxSeconds: maxSeconds ? Number(maxSeconds) : 60,
            maxUrls: maxUrls ? Number(maxUrls) : -1, // -1 for unlimited
        };
        try {
            const response = await axios.post(globals.api.crawl, request, { responseType: 'text' });
            const id = response.data;
            onCrawlStarted(id, request.maxSeconds);
            saveHistory(HISTORY_KEY_URL, url, urlHistory);
            if (maxDistance) saveHistory(HISTORY_KEY_DISTANCE, maxDistance, distanceHistory);
            if (maxSeconds) saveHistory(HISTORY_KEY_SECONDS, maxSeconds, secondsHistory);
            if (maxUrls) saveHistory(HISTORY_KEY_URLS, maxUrls, urlsHistory);
            setUrlHistory(loadHistory(HISTORY_KEY_URL));
            setDistanceHistory(loadHistory(HISTORY_KEY_DISTANCE));
            setSecondsHistory(loadHistory(HISTORY_KEY_SECONDS));
            setUrlsHistory(loadHistory(HISTORY_KEY_URLS));
        } catch (err) {
            console.error(err);
            setError('Failed to start crawl. Please check the URL and try again.');
        }
    };

    const handleSearch = async () => {
        setError('');
        if (!searchQuery.trim()) {
            onSearch([], false);
            return;
        }
        try {
            const response = await axios.get(globals.api.search, { params: { query: searchQuery.trim() } });
            onSearch(response.data || [], true);
            saveHistory(HISTORY_KEY_QUERY, searchQuery, queryHistory);
            setQueryHistory(loadHistory(HISTORY_KEY_QUERY));
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

    const toggleAdvanced = () => {
        setShowAdvanced(!showAdvanced);
    };

    // Validate and update maxSeconds (1-9999)
    const handleMaxSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMaxSeconds('');
            return;
        }
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 9999) {
            setMaxSeconds(value);
        }
        // Ignore invalid input
    };

    // Validate and update maxDistance (1-99)
    const handleMaxDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMaxDistance('');
            return;
        }
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 99) {
            setMaxDistance(value);
        }
        // Ignore invalid input
    };

    // Validate and update maxUrls (1-99999999)
    const handleMaxUrlsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMaxUrls('');
            return;
        }
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 99999999) {
            setMaxUrls(value);
        }
        // Ignore invalid input
    };

    return (
        <div className="search-bar-container">
            <div className="crawl-form">
                <div className="input-group">
                    <label>Enter a website URL (e.g., ynet.co.il)</label>
                    <input
                        type="text"
                        list="url-history"
                        placeholder="URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={onCrawlKey}
                    />
                    <datalist id="url-history">
                        {urlHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                <div className="input-group">
                    <label>Max seconds (e.g., 60)</label>
                    <input
                        type="number"
                        list="seconds-history"
                        placeholder="Max Seconds"
                        value={maxSeconds}
                        onChange={handleMaxSecondsChange}
                        onKeyDown={onCrawlKey}
                        min="1"
                        max="9999"
                    />
                    <datalist id="seconds-history">
                        {secondsHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                {showAdvanced && (
                    <>
                        <div className="input-group">
                            <label>Max crawl depth (e.g., 2)</label>
                            <input
                                type="number"
                                list="distance-history"
                                placeholder="Max Depth"
                                value={maxDistance}
                                onChange={handleMaxDistanceChange}
                                onKeyDown={onCrawlKey}
                                min="1"
                                max="99"
                            />
                            <datalist id="distance-history">
                                {distanceHistory.map((item, index) => <option key={index} value={item} />)}
                            </datalist>
                        </div>
                        <div className="input-group">
                            <label>Max URLs (e.g., 1000)</label>
                            <input
                                type="number"
                                list="urls-history"
                                placeholder="Max URLs"
                                value={maxUrls}
                                onChange={handleMaxUrlsChange}
                                onKeyDown={onCrawlKey}
                                min="1"
                                max="99999999"
                            />
                            <datalist id="urls-history">
                                {urlsHistory.map((item, index) => <option key={index} value={item} />)}
                            </datalist>
                        </div>
                    </>
                )}
                <a href="#" className="toggle-advanced-link" onClick={(e) => { e.preventDefault(); toggleAdvanced(); }}>
                    {showAdvanced ? 'Hide Advanced' : 'Advanced'}
                </a>
                <button onClick={handleCrawl}>Start Crawl</button>
            </div>
            <div className="search-form">
                <div className="input-group">
                    <label>Enter a keyword to search (e.g., news)</label>
                    <input
                        type="text"
                        list="query-history"
                        placeholder="Search Query"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={onSearchKey}
                    />
                    <datalist id="query-history">
                        {queryHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                <button onClick={handleSearch}>Search</button>
            </div>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SearchBar;