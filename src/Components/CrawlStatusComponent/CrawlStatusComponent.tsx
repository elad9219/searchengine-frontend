import React, { useEffect, useRef, useState } from 'react';
import './CrawlStatusComponent.css';
import globals from '../../utils/globals';
import { CrawlStatus } from '../../modal/CrawlStatus';

type Props = {
    crawlId: string;
    maxSeconds: number;
};

const fmtTime = (millis?: number) => {
    if (!millis || millis <= 0) return '—';
    const d = new Date(millis);
    return d.toLocaleString();
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const POLL_MS = 2000;

const CrawlStatusComponent: React.FC<Props> = ({ crawlId, maxSeconds }) => {
    const [status, setStatus] = useState<CrawlStatus | null>(null);
    const [error, setError] = useState('');
    const startedAtRef = useRef<number>(Date.now());
    const pollingRef = useRef<number | null>(null);
    const visualTimerRef = useRef<number | null>(null);
    const [elapsedVisible, setElapsedVisible] = useState(0);

    useEffect(() => {
        if (!crawlId) {
            return;
        }

        startedAtRef.current = Date.now();
        setElapsedVisible(0);
        if (visualTimerRef.current) {
            window.clearInterval(visualTimerRef.current);
        }
        visualTimerRef.current = window.setInterval(() => {
            const elapsed = (Date.now() - startedAtRef.current) / 1000;
            setElapsedVisible(elapsed);
        }, 100);

        return () => {
            if (visualTimerRef.current) {
                window.clearInterval(visualTimerRef.current);
            }
        };
    }, [crawlId]);

    useEffect(() => {
        if (!crawlId) {
            setStatus(null);
            setError('');
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
            }
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await fetch(`${globals.api.getCrawlStatus}/${crawlId}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        setStatus(prevStatus => prevStatus ? { ...prevStatus, stopReason: 'timeout' } : null);
                        setError('');
                        if (pollingRef.current) {
                            window.clearInterval(pollingRef.current);
                        }
                    } else {
                        throw new Error(`HTTP ${res.status}`);
                    }
                } else {
                    const data = await res.json();
                    setStatus(data);
                    setError(data.errorMessage || ''); 
                    if (data.stopReason) {
                        if (pollingRef.current) {
                            window.clearInterval(pollingRef.current);
                        }
                    }
                }
            } catch (e) {
                setError('Failed to fetch status');
                if (pollingRef.current) {
                    window.clearInterval(pollingRef.current);
                }
            }
        };

        fetchStatus();
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
        }
        pollingRef.current = window.setInterval(fetchStatus, POLL_MS);

        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
            }
        };
    }, [crawlId]);

    const elapsedSec = Math.min(elapsedVisible, maxSeconds);
    const remainingSec = Math.max(0, maxSeconds - elapsedSec);
    const progress = clamp01(elapsedSec / Math.max(1, maxSeconds));
    const finalDone = Boolean(status?.stopReason);
    const stopReasonText = status?.stopReason ? status.stopReason : '—';
    const isRunning = !finalDone;

    return (
        <div className="crawl-status-root">
            <div className="crawl-status-header">
                {finalDone ? <div className="finished-mark">✓</div> : null}
                <h3 className="crawl-status-title">Crawl Status {crawlId ? (<span className="crawl-id"> (ID: {crawlId})</span>) : null}</h3>
            </div>

            <div className="crawl-status-box">
                <div className="progress-wrap">
                    <div className="progress-bar-bg">
                        <div className={`progress-fill ${finalDone ? 'done' : 'running'}`} style={{ width: `${progress * 100}%` }} />
                    </div>
                </div>

                <div className="status-grid">
                    <div>
                        <div className="label">Distance:</div>
                        <div className="value">{status ? status.distance : '—'}</div>
                    </div>
                    <div>
                        <div className="label">Pages visited:</div>
                        <div className="value">{status ? status.numPages : '—'}</div>
                    </div>
                    <div>
                        <div className="label">Started:</div>
                        <div className="value">{status ? fmtTime(status.startTimeMillis) : '—'}</div>
                    </div>
                    <div>
                        <div className="label">Last modified:</div>
                        <div className="value">{status ? fmtTime(status.lastModifiedMillis) : '—'}</div>
                    </div>
                    <div>
                        <div className="label">Elapsed:</div>
                        <div className="value">{Math.floor(elapsedSec)}s</div>
                    </div>
                    <div>
                        <div className="label">Remaining:</div>
                        <div className="value">{Math.ceil(remainingSec)}s</div>
                    </div>
                </div>

                <div className="stop-reason">
                    <strong>Stop reason:</strong> {stopReasonText}
                </div>

                {error && <div className="error">{error}</div>}
            </div>
        </div>
    );
};

export default CrawlStatusComponent;