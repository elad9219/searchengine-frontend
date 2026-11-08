import React, { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import axiosInstance from '../../utils/axiosInstance';
import globals from '../../utils/globals';
import { crawlLimits, maxCrawlUrlLength, maxSearchQueryLength } from '../../utils/demoLimits';
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

type CrawlLimit = typeof crawlLimits.seconds;

const withinLimit = (value: number, limit: CrawlLimit): boolean =>
    Number.isInteger(value) && value >= limit.min && value <= limit.max;

interface LimitInputProps {
    id: string;
    label: string;
    limit: CrawlLimit;
    value: string;
    history: string[];
    disabled?: boolean;
    onChange: (value: string) => void;
}

const LimitInput = ({ id, label, limit, value, history, disabled, onChange }: LimitInputProps) => (
    <div className="input-group">
        <label htmlFor={id}>{label} ({limit.min}–{limit.max})</label>
        <input
            id={id}
            type="number"
            list={id + '-history'}
            placeholder={`Default: ${limit.defaultValue}`}
            value={value}
            onChange={event => onChange(event.target.value)}
            min={limit.min}
            max={limit.max}
            step={1}
            disabled={disabled}
        />
        <datalist id={id + '-history'}>
            {history.filter(item => withinLimit(Number(item), limit))
                .map((item, index) => <option key={index} value={item} />)}
        </datalist>
    </div>
);

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
        const targetUrl = url.trim();
        if (!targetUrl) {
            setError('Please enter a URL to crawl.');
            return;
        }

        if (targetUrl.length > maxCrawlUrlLength) {
            setError(`Use a URL of ${maxCrawlUrlLength} characters or fewer.`);
            return;
        }

        const request: CrawlerRequest = {
            url: targetUrl,
            maxDistance: maxDistance === '' ? crawlLimits.depth.defaultValue : Number(maxDistance),
            maxSeconds: maxSeconds === '' ? crawlLimits.seconds.defaultValue : Number(maxSeconds),
            maxUrls: maxUrls === '' ? crawlLimits.urls.defaultValue : Number(maxUrls)
        };

        const limits = [
            { value: request.maxSeconds, limit: crawlLimits.seconds, label: 'Max seconds', advanced: false },
            { value: request.maxDistance, limit: crawlLimits.depth, label: 'Max crawl depth', advanced: true },
            { value: request.maxUrls, limit: crawlLimits.urls, label: 'Max URLs', advanced: true }
        ];
        const invalid = limits.find(({ value, limit }) => !withinLimit(value, limit));
        if (invalid) {
            if (invalid.advanced) setShowAdvanced(true);
            setError(`${invalid.label} must be a whole number from ${invalid.limit.min} to ${invalid.limit.max}.`);
            return;
        }

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
        } catch (error) {
            const status = isAxiosError(error) ? error.response?.status : undefined;
            if (status === 429) {
                setError('The demo crawl limit has been reached. Wait a minute and try again.');
            } else if (status === 400) {
                setError('The server rejected the crawl request. Check the website URL and crawl limits.');
            } else {
                setError('Could not confirm that the crawl started.');
            }
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
        if (query.length > maxSearchQueryLength) {
            setError(`Use a search query of ${maxSearchQueryLength} characters or fewer.`);
            return;
        }

        requestInFlight.current = true;
        setPending('search');
        try {
            const { data } = await axiosInstance.get<SearchResult[]>(globals.api.search, {
                params: { query }
            });
            if (!Array.isArray(data)) throw new Error('Invalid search response');
            onSearch(data, true);
            setQueryHistory(saveHistory(HISTORY_KEY_QUERY, query, queryHistory));
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 503) {
                setError('Search is temporarily unavailable. Please try again later.');
            } else {
                setError('Failed to fetch search results. Please try again.');
            }
        } finally {
            requestInFlight.current = false;
            setPending(null);
        }
    };

    return (
        <div className="search-bar-container">
            <form className="crawl-form" onSubmit={handleCrawl}>
                <div className="input-group">
                    <label htmlFor="crawl-url">Website URL</label>
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
                <LimitInput
                    id="crawl-seconds"
                    label="Max seconds"
                    limit={crawlLimits.seconds}
                    value={maxSeconds}
                    history={secondsHistory}
                    disabled={controlsDisabled}
                    onChange={setMaxSeconds}
                />
                {showAdvanced && (
                    <>
                        <LimitInput
                            id="crawl-depth"
                            label="Max crawl depth"
                            limit={crawlLimits.depth}
                            value={maxDistance}
                            history={distanceHistory}
                            disabled={controlsDisabled}
                            onChange={setMaxDistance}
                        />
                        <LimitInput
                            id="crawl-max-urls"
                            label="Max URLs"
                            limit={crawlLimits.urls}
                            value={maxUrls}
                            history={urlsHistory}
                            disabled={controlsDisabled}
                            onChange={setMaxUrls}
                        />
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