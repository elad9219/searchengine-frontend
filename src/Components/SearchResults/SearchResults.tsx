import React from 'react';
import './SearchResults.css';
import { SearchResult } from '../../modal/SearchResult';

const safeUrl = (value: string): string | undefined => {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
    } catch {
        return undefined;
    }
};

const renderSnippet = (snippet: string): React.ReactNode[] => {
    let highlighted = false;
    return snippet.split(/(<\/?em>)/gi).map((part, index) => {
        if (/^<em>$/i.test(part)) {
            highlighted = true;
            return null;
        }
        if (/^<\/em>$/i.test(part)) {
            highlighted = false;
            return null;
        }
        // React escapes all text. Only our own emphasis element becomes markup.
        return highlighted
            ? <em key={index}>{part}</em>
            : <React.Fragment key={index}>{part}</React.Fragment>;
    });
};

const SearchResults: React.FC<{ results: SearchResult[]; searchPerformed: boolean }> = ({ results, searchPerformed }) => {
    if (!searchPerformed) return null;
    if (!Array.isArray(results)) return <p role="alert">Invalid search response.</p>;
    if (results.length === 0) return <p>No results found.</p>;

    return (
        <div className="search-results-container">
            <h3>Search Results</h3>
            <ul>
                {results.map((result, index) => {
                    if (!result || typeof result.url !== 'string') return null;
                    const href = safeUrl(result.url);
                    return (
                        <li key={index} className="search-result-item">
                            {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="result-url">
                                    {result.url}
                                </a>
                            ) : <span className="result-url">{result.url}</span>}
                            <div className="result-snippet">
                                {renderSnippet(typeof result.snippet === 'string' ? result.snippet : '')}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default SearchResults;