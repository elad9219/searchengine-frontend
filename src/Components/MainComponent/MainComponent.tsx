import React, { useState } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import CrawlStatusComponent from '../CrawlStatus/CrawlStatus';
import SearchResults from '../SearchResults/SearchResults';
import './MainComponent.css';

/**
 * MainComponent is the central component that integrates all other components and manages their state.
 */
const MainComponent: React.FC = () => {
    const [crawlId, setCrawlId] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);

    const handleCrawlStarted = (id: string) => {
        setCrawlId(id);
        setSearchResults([]);
    };

    const handleSearch = (results: string[]) => {
        setSearchResults(results);
    };

    return (
        <div className="main-component-container">
            <h1>Web Search Engine</h1>
            <SearchBar onCrawlStarted={handleCrawlStarted} onSearch={handleSearch} />
            <CrawlStatusComponent crawlId={crawlId} />
            <SearchResults results={searchResults} />
        </div>
    );
};

export default MainComponent;