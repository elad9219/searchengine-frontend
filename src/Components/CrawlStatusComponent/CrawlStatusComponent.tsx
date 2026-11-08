import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { IconButton } from '@mui/material';
import { Stop } from '@mui/icons-material';
import { CrawlStatus } from '../../modal/CrawlStatus';
import axiosInstance from '../../utils/axiosInstance';
import globals from '../../utils/globals';
import './CrawlStatusComponent.css';

type Props = {
    crawlId: string;
    maxSeconds: number;
};

type StatusResponse = CrawlStatus & { errorMessage?: string | null };

const POLL_MS = 2000;

const formatTime = (millis?: number) =>
    millis && millis > 0 ? new Date(millis).toLocaleString() : '—';

const CrawlStatusComponent: React.FC<Props> = ({ crawlId, maxSeconds }) => {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [now, setNow] = useState(Date.now);
    const [statusError, setStatusError] = useState('');
    const [stopError, setStopError] = useState('');
    const [missing, setMissing] = useState(false);
    const [stopping, setStopping] = useState(false);
    const stopRequest = useRef<AbortController | null>(null);
    const statusUrl = `${globals.api.getCrawlStatus}/${encodeURIComponent(crawlId)}`;
    const finished = Boolean(status?.stopReason);
    const stoppedByUser = status?.stopReason === 'userInitiated';
    const running = !finished && !missing;

    useEffect(() => {
        const controller = new AbortController();
        let nextPoll: number | undefined;

        const fetchStatus = async () => {
            try {
                const { data } = await axiosInstance.get<StatusResponse>(statusUrl, {
                    signal: controller.signal
                });
                if (controller.signal.aborted) return;
                setStatus(data);
                setNow(Date.now());
                setStatusError('');
                if (data.stopReason) return;
            } catch (error) {
                if (controller.signal.aborted) return;
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    setMissing(true);
                    setStatusError('This crawl was not found or has expired.');
                    return;
                }
                setStatusError('Could not fetch crawl status. Retrying…');
            }
            nextPoll = window.setTimeout(fetchStatus, POLL_MS);
        };

        void fetchStatus();

        return () => {
            controller.abort();
            window.clearTimeout(nextPoll);
            stopRequest.current?.abort();
        };
    }, [statusUrl]);

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timer);
    }, [running]);

    const elapsed = status
        ? Math.max(0, ((finished ? status.lastModifiedMillis : now) - status.startTimeMillis) / 1000)
        : 0;
    const elapsedSeconds = finished ? elapsed : Math.min(elapsed, maxSeconds);
    const remainingSeconds = finished ? 0 : Math.max(0, maxSeconds - elapsedSeconds);
    const progress = finished ? 100 : 100 * elapsedSeconds / Math.max(1, maxSeconds);

    const handleStopClick = async () => {
        if (!running || stopRequest.current) return;
        const controller = new AbortController();
        stopRequest.current = controller;
        setStopping(true);
        setStopError('');

        try {
            await axiosInstance.post(`${statusUrl}/stop`, undefined, { signal: controller.signal });
        } catch {
            if (controller.signal.aborted) return;
            stopRequest.current = null;
            setStopping(false);
            setStopError('Could not confirm the stop request. Checking crawl status.');
        }
    };

    return (
        <div className="crawl-status-root">
            <div className="crawl-status-header">
                {finished && status?.stopReason !== 'error' && <div className="finished-mark">✓</div>}
                <h3 className="crawl-status-title">
                    Crawl Status <span className="crawl-id">(ID: {crawlId})</span>
                </h3>
                {running && (
                    <IconButton
                        color="error"
                        aria-label={stopping ? 'Stopping crawl' : 'Stop crawl'}
                        onClick={handleStopClick}
                        disabled={stopping}
                        sx={{
                            padding: '6px',
                            marginLeft: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#ff4444',
                            '&:hover': { backgroundColor: '#cc0000' }
                        }}
                    >
                        <Stop sx={{ fontSize: '20px', color: 'white' }} />
                    </IconButton>
                )}
            </div>

            <div className="crawl-status-box">
                <div className="progress-wrap">
                    <div className="progress-bar-bg">
                        <div
                            className={`progress-fill ${finished ? 'done' : 'running'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="status-grid">
                    <div>
                        <div className="label">Distance:</div>
                        <div className="value">{status?.distance ?? '—'}</div>
                    </div>
                    <div>
                        <div className="label">Pages visited:</div>
                        <div className="value">{status?.numPages ?? '—'}</div>
                    </div>
                    <div>
                        <div className="label">Started:</div>
                        <div className="value">{formatTime(status?.startTimeMillis)}</div>
                    </div>
                    <div>
                        <div className="label">Last modified:</div>
                        <div className="value">{formatTime(status?.lastModifiedMillis)}</div>
                    </div>
                    <div>
                        <div className="label">Elapsed:</div>
                        <div className="value">{status && !missing ? `${Math.floor(elapsedSeconds)}s` : '—'}</div>
                    </div>
                    <div>
                        <div className="label">Remaining:</div>
                        <div className="value">{status && !missing ? `${Math.ceil(remainingSeconds)}s` : '—'}</div>
                    </div>
                </div>

                <div className="stop-reason">
                    <strong>Stop reason:</strong> {status?.stopReason || '—'}
                </div>

                {statusError && <div className="error" role="status">{statusError}</div>}
                {!finished && !missing && stopError && <div className="error" role="status">{stopError}</div>}
                {status?.errorMessage && (
                    <div className={stoppedByUser ? 'crawl-notice' : 'error'} role="status">
                        {status.errorMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrawlStatusComponent;