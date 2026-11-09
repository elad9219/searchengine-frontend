import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import axiosInstance from '../../utils/axiosInstance';
import CrawlStatusComponent from './CrawlStatusComponent';

jest.mock('../../utils/axiosInstance', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn() }
}));

const getStatus = axiosInstance.get as jest.Mock;
const stopCrawl = axiosInstance.post as jest.Mock;
const start = 1700000000000;
const runningStatus = {
    distance: 0,
    numPages: 1,
    startTimeMillis: start,
    lastModifiedMillis: start,
    stopReason: null
};

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(start);
});

afterEach(() => {
    jest.useRealTimers();
});

test('freezes elapsed time at the duration reported by the server', async () => {
    getStatus.mockResolvedValue({
        data: { ...runningStatus, stopReason: 'maxUrls', lastModifiedMillis: start + 2000 }
    });

    render(<CrawlStatusComponent crawlId="test" maxSeconds={20} />);
    expect(await screen.findByText('2s')).toBeInTheDocument();
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText(/Reached the URL limit/)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(22000));

    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(getStatus).toHaveBeenCalledTimes(1);
});

test('keeps polling after the countdown expires until the server reports a stop reason', async () => {
    getStatus.mockResolvedValueOnce({ data: runningStatus }).mockResolvedValueOnce({
        data: { ...runningStatus, stopReason: 'timeout', lastModifiedMillis: start + 1000 }
    });

    render(<CrawlStatusComponent crawlId="test" maxSeconds={1} />);
    await screen.findByText('1s');

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Stop crawl' })).toBeInTheDocument();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/Reached the time limit/)).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
});

test('continues polling when the stop request fails', async () => {
    getStatus.mockResolvedValue({ data: runningStatus });
    stopCrawl.mockRejectedValue(new Error('Request failed'));

    render(<CrawlStatusComponent crawlId="test" maxSeconds={20} />);
    await screen.findByText('20s');

    fireEvent.click(screen.getByRole('button', { name: 'Stop crawl' }));
    expect(await screen.findByText(/Could not confirm the stop request/)).toBeInTheDocument();
    expect(screen.queryByText(/Stopped by user/)).not.toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(2000));
    expect(getStatus).toHaveBeenCalledTimes(2);
});