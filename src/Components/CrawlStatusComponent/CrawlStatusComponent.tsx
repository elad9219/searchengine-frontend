import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import globals from '../../utils/globals';
import { CrawlStatus } from '../../modal/CrawlStatus';
import './CrawlStatusComponent.css';

interface Props {
    crawlId: string;
}

export default function CrawlStatusComponent({ crawlId }: Props) {
    const [status, setStatus] = useState<CrawlStatus | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [error, setError] = useState('');
    const pollingRef = useRef<number | null>(null);

const fetchStatus = async (showLoading = false) => {
    if (!crawlId) return;
    if (showLoading) setLoadingInitial(true);
    try {
        const res = await axios.get<CrawlStatus>(`${globals.api.getCrawlStatus}/${crawlId}`);
        const data = res.data;
        setStatus(data);
        setError('');
        // client-side determine stop if maxTime reached
        const now = Date.now();
        const reachedMax = data.maxTimeMillis && now >= data.maxTimeMillis;
        const finished = Boolean(data.stopReason || (data as any).status === 'finished' || reachedMax);
        if (finished && pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        // if reachedMax but stopReason not yet set in backend, set a visible local marker (won't persist)
        if (reachedMax && !data.stopReason) {
            setStatus(prev => prev ? { ...prev, stopReason: 'timeout' } : prev);
        }
    } catch (err) {
        setError('Failed to fetch crawl status.');
    } finally {
        if (showLoading) setLoadingInitial(false);
    }
};

    useEffect(() => {
        if (!crawlId) {
            setStatus(null);
            setError('');
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            return;
        }
        // initial fetch
        fetchStatus(true);
        // set interval
        pollingRef.current = window.setInterval(() => fetchStatus(false), 2500);
        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [crawlId]);

    const formatTime = (millis?: number) => {
        if (!millis || millis <= 0) return '-';
        return new Date(millis).toLocaleString();
    };

    const elapsedSeconds = () => {
        if (!status?.startTimeMillis) return 0;
        return Math.floor(((status.lastModifiedMillis ?? Date.now()) - status.startTimeMillis) / 1000);
    };

    const remainingSeconds = () => {
        if (!status?.maxTimeMillis) return null;
        const rem = Math.max(0, Math.floor((status.maxTimeMillis - (status.lastModifiedMillis ?? Date.now())) / 1000));
        return rem;
    };

    const progressPercent = () => {
        if (!status?.startTimeMillis || !status?.maxTimeMillis) return 0;
        const total = Math.max(1, status.maxTimeMillis - status.startTimeMillis);
        const done = Math.max(0, (status.lastModifiedMillis ?? Date.now()) - status.startTimeMillis);
        return Math.min(100, Math.round((done / total) * 100));
    };

    return (
        <div className="crawl-status-container">
            <h3>Crawl Status{crawlId ? ` (ID: ${crawlId})` : ''}</h3>

            {loadingInitial && (
                <div className="status-loading">
                    <div className="spinner" />
                    <span>Starting crawl...</span>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {status && (
                <div className="status-body">
                    <div className="status-row">
                        <div className={`status-indicator ${status.stopReason ? 'stopped' : 'running'}`} />
                        <div className="status-main">
                            <div className="progress-bar">
                                <div className="progress" style={{ width: `${progressPercent()}%` }} />
                            </div>
                            <div className="status-numbers">
                                <div>Distance: <strong>{status.distance}</strong></div>
                                <div>Pages visited: <strong>{status.numPages}</strong></div>
                            </div>
                        </div>
                    </div>

                    <div className="times">
                        <div>Started: <strong>{formatTime(status.startTimeMillis)}</strong></div>
                        <div>Last modified: <strong>{formatTime(status.lastModifiedMillis)}</strong></div>
                        <div>Elapsed: <strong>{elapsedSeconds()}s</strong></div>
                        <div>Remaining: <strong>{remainingSeconds() !== null ? `${remainingSeconds()}s` : '—'}</strong></div>
                        <div>Stop reason: <strong>{status.stopReason ?? '-'}</strong></div>
                    </div>
                </div>
            )}
        </div>
    );
}
