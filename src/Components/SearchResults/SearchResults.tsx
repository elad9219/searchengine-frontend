import React from 'react';
import { SearchResult } from '../../modal/SearchResult';
import './SearchResults.css';

/**
 * SearchResults component to display search results from ElasticSearch.
 */
const SearchResults: React.FC<{ results: string[] }> = ({ results }) => {
    if (!results || results.length === 0) return <p>No results found.</p>;

    return (
        <div className="search-results-container">
            <h3>Search Results</h3>
            <ul>
                {results.map((url, index) => (
                    <li key={index}>
                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SearchResults;