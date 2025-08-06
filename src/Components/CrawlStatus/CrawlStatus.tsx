import React, { useEffect, useState } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlStatus as CrawlStatusType } from '../../modal/CrawlStatus';
import './CrawlStatus.css';

/**
 * CrawlStatusComponent displays the status of a crawl.
 */
const CrawlStatusComponent: React.FC<{ crawlId: string }> = ({ crawlId }) => {
    const [status, setStatus] = useState<CrawlStatusType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!crawlId) return;

        const fetchStatus = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${globals.api.getCrawlStatus}/${crawlId}`);
                setStatus(response.data);
            } catch (err) {
                setError('Failed to fetch crawl status.');
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [crawlId]);

    if (!crawlId) return null;
    if (loading) return <p>Loading crawl status...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="crawl-status-container">
            <h3>Crawl Status (ID: {crawlId})</h3>
            {status && (
                <div>
                    <p>Distance: {status.distance}</p>
                    <p>Start Time: {status.startTime}</p>
                    <p>Last Modified: {status.lastModified}</p>
                    <p>Number of Pages: {status.numPages}</p>
                    <p>Stop Reason: {status.stopReason || 'In Progress'}</p>
                </div>
            )}
        </div>
    );
};

export default CrawlStatusComponent;