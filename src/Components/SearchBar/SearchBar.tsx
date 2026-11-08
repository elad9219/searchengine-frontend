import React, { useRef, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
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
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [];
    } catch {
        return [];
    }
};

const saveHistory = (key: string, value: string, history: string[]): string[] => {
    if (!value) return history;
    const updated = [value, ...history.filter(entry => entry !== value)].slice(0, MAX_HISTORY);
    try {
        localStorage.setItem(key, JSON.stringify(updated));
    } catch {
        // The current session can still use the history when storage is unavailable.
    }
    return updated;
};

interface Props {
    onCrawlStarted: (id: string, maxSeconds: number | null) => void;
    onSearch: (results: SearchResult[], performed: boolean) => void;
    disabled?: boolean;
}

const SearchBar: React.FC<Props> = ({ onCrawlStarted, onSearch, disabled }) => {
    const [url, setUrl] = useState('');
    const [maxDistance, setMaxDistance] = useState('');
    const [maxSeconds, setMaxSeconds] = useState('');
    const [maxUrls, setMaxUrls] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [pending, setPending] = useState<'crawl' | 'search' | null>(null);
    const requestInFlight = useRef(false);
    const controlsDisabled = disabled || pending !== null;

    const [urlHistory, setUrlHistory] = useState(() => loadHistory(HISTORY_KEY_URL));
    const [distanceHistory, setDistanceHistory] = useState(() => loadHistory(HISTORY_KEY_DISTANCE));
    const [secondsHistory, setSecondsHistory] = useState(() => loadHistory(HISTORY_KEY_SECONDS));
    const [urlsHistory, setUrlsHistory] = useState(() => loadHistory(HISTORY_KEY_URLS));
    const [queryHistory, setQueryHistory] = useState(() => loadHistory(HISTORY_KEY_QUERY));

    const handleCrawl = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (disabled || requestInFlight.current) return;

        setError('');
        if (!url.trim()) {
            setError('Please enter a URL to crawl.');
            return;
        }

        const request: CrawlerRequest = {
            url: url.trim(),
            maxDistance: maxDistance ? Number(maxDistance) : -1,
            maxSeconds: maxSeconds ? Number(maxSeconds) : 60,
            maxUrls: maxUrls ? Number(maxUrls) : -1
        };

        requestInFlight.current = true;
        setPending('crawl');
        try {
            const { data: id } = await axiosInstance.post<string>(globals.api.crawl, request, {
                responseType: 'text'
            });
            onCrawlStarted(id, request.maxSeconds);
            setUrlHistory(saveHistory(HISTORY_KEY_URL, request.url, urlHistory));
            setDistanceHistory(saveHistory(HISTORY_KEY_DISTANCE, maxDistance, distanceHistory));
            setSecondsHistory(saveHistory(HISTORY_KEY_SECONDS, maxSeconds, secondsHistory));
            setUrlsHistory(saveHistory(HISTORY_KEY_URLS, maxUrls, urlsHistory));
        } catch {
            setError('Could not confirm that the crawl started.');
        } finally {
            requestInFlight.current = false;
            setPending(null);
        }
    };

    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (disabled || requestInFlight.current) return;

        setError('');
        onSearch([], false);
        const query = searchQuery.trim();
        if (!query) return;

        requestInFlight.current = true;
        setPending('search');
        try {
            const { data } = await axiosInstance.get<SearchResult[]>(globals.api.search, {
                params: { query }
            });
            if (!Array.isArray(data)) throw new Error('Invalid search response');
            onSearch(data, true);
            setQueryHistory(saveHistory(HISTORY_KEY_QUERY, query, queryHistory));
        } catch {
            setError('Failed to fetch search results. Please try again.');
        } finally {
            requestInFlight.current = false;
            setPending(null);
        }
    };

    return (
        <div className="search-bar-container">
            <form className="crawl-form" onSubmit={handleCrawl}>
                <div className="input-group">
                    <label htmlFor="crawl-url">Enter a website URL (e.g., ynet.co.il)</label>
                    <input
                        id="crawl-url"
                        type="text"
                        list="url-history"
                        placeholder="URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={controlsDisabled}
                    />
                    <datalist id="url-history">
                        {urlHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                <div className="input-group">
                    <label htmlFor="crawl-seconds">Max seconds (e.g., 60)</label>
                    <input
                        id="crawl-seconds"
                        type="number"
                        list="seconds-history"
                        placeholder="Max Seconds"
                        value={maxSeconds}
                        onChange={event => setMaxSeconds(event.target.value)}
                        min="1"
                        max="9999"
                        disabled={controlsDisabled}
                    />
                    <datalist id="seconds-history">
                        {secondsHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                {showAdvanced && (
                    <>
                        <div className="input-group">
                            <label htmlFor="crawl-depth">Max crawl depth (e.g., 2)</label>
                            <input
                                id="crawl-depth"
                                type="number"
                                list="distance-history"
                                placeholder="Max Depth"
                                value={maxDistance}
                                onChange={event => setMaxDistance(event.target.value)}
                                min="1"
                                max="99"
                                disabled={controlsDisabled}
                            />
                            <datalist id="distance-history">
                                {distanceHistory.map((item, index) => <option key={index} value={item} />)}
                            </datalist>
                        </div>
                        <div className="input-group">
                            <label htmlFor="crawl-max-urls">Max URLs (e.g., 1000)</label>
                            <input
                                id="crawl-max-urls"
                                type="number"
                                list="urls-history"
                                placeholder="Max URLs"
                                value={maxUrls}
                                onChange={event => setMaxUrls(event.target.value)}
                                min="1"
                                max="99999999"
                                disabled={controlsDisabled}
                            />
                            <datalist id="urls-history">
                                {urlsHistory.map((item, index) => <option key={index} value={item} />)}
                            </datalist>
                        </div>
                    </>
                )}
                <button
                    type="button"
                    className="toggle-advanced-link"
                    aria-expanded={showAdvanced}
                    disabled={controlsDisabled}
                    onClick={() => setShowAdvanced(value => !value)}
                >
                    {showAdvanced ? 'Hide Advanced' : 'Advanced'}
                </button>
                <button type="submit" disabled={controlsDisabled}>
                    {pending === 'crawl' && !disabled ? 'Starting…' : 'Start Crawl'}
                </button>
            </form>
            <form className="search-form" onSubmit={handleSearch}>
                <div className="input-group">
                    <label htmlFor="search-query">Enter a keyword to search (e.g., news)</label>
                    <input
                        id="search-query"
                        type="text"
                        list="query-history"
                        placeholder="Search Query"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={controlsDisabled}
                    />
                    <datalist id="query-history">
                        {queryHistory.map((item, index) => <option key={index} value={item} />)}
                    </datalist>
                </div>
                <button type="submit" disabled={controlsDisabled}>
                    {pending === 'search' && !disabled ? 'Searching…' : 'Search'}
                </button>
            </form>
            {error && <p className="error-message" role="alert">{error}</p>}
        </div>
    );
};

export default SearchBar;