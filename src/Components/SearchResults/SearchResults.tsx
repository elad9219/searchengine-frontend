import React from 'react';
import { SearchResult } from '../../modal/SearchResult';
import './SearchResults.css';

interface Props {
    results: SearchResult[];
    searchPerformed: boolean;
}

export default function SearchResults({ results, searchPerformed }: Props) {
    if (!searchPerformed) return null;
    if (!results || results.length === 0) return <p>No results found.</p>;

    return (
        <div className="search-results-container">
            <h3>Search Results</h3>
            <ul>
                {results.map((r, i) => (
                    <li key={i} className="result-item">
                        <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
                        <div className="snippet" dangerouslySetInnerHTML={{ __html: r.snippet || '' }} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
