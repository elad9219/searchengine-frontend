import React from 'react';
import './SearchResults.css';
import { SearchResult } from '../../modal/SearchResult';

const SearchResults: React.FC<{ results: SearchResult[], searchPerformed: boolean }> = ({ results, searchPerformed }) => {
    if (!searchPerformed) return null; // don't show anything until a search was performed
    if (!results || results.length === 0) return <p>No results found.</p>;

    return (
        <div className="search-results-container">
            <h3>Search Results</h3>
            <ul>
                {results.map((r, index) => (
                    <li key={index} className="search-result-item">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="result-url">{r.url}</a>
                        <div className="result-snippet" dangerouslySetInnerHTML={{ __html: r.snippet || '' }} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SearchResults;
