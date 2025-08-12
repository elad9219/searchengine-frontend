import React, { useState } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import CrawlStatusComponent from '../CrawlStatusComponent/CrawlStatusComponent';
import SearchResults from '../SearchResults/SearchResults';
import './MainComponent.css';
import { SearchResult } from '../../modal/SearchResult';

const MainComponent: React.FC = () => {
    const [crawlId, setCrawlId] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const handleCrawlStarted = (id: string) => {
        setCrawlId(id);
        setSearchResults([]);
        setSearchPerformed(false);
    };

    const handleSearch = (results: SearchResult[], performed: boolean) => {
        setSearchResults(results);
        setSearchPerformed(performed);
    };

    return (
        <div className="main-component-container">
            <h1>Web Search Engine</h1>
            <SearchBar onCrawlStarted={handleCrawlStarted} onSearch={handleSearch} />
            <CrawlStatusComponent crawlId={crawlId} />
            <SearchResults results={searchResults} searchPerformed={searchPerformed} />
        </div>
    );
};

export default MainComponent;
