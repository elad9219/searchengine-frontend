import React from 'react';
import { AxiosAdapter, AxiosError } from 'axios';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import axiosInstance, { createApiClient } from './utils/axiosInstance';

const setCrawlUrl = () => {
    const input = screen.getByLabelText('Website URL');
    fireEvent.change(input, { target: { value: 'example.com' } });
    return input;
};

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    jest.restoreAllMocks();
});

test('sends the server defaults when the crawl settings are blank', () => {
    const post = jest.spyOn(axiosInstance, 'post').mockImplementation(() => new Promise(() => {}));
    render(<App />);
    setCrawlUrl();
    fireEvent.click(screen.getByRole('button', { name: 'Start Crawl' }));

    expect(post).toHaveBeenCalledWith(expect.any(String), {
        url: 'example.com', maxSeconds: 60, maxDistance: 2, maxUrls: 25
    }, { responseType: 'text' });
});

test('preserves depth zero and accepts the maximum duration and URL count', () => {
    const post = jest.spyOn(axiosInstance, 'post').mockImplementation(() => new Promise(() => {}));
    render(<App />);
    setCrawlUrl();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText(/Max seconds/), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText(/Max crawl depth/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Max URLs/), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start Crawl' }));

    expect(post).toHaveBeenCalledWith(expect.any(String), {
        url: 'example.com', maxSeconds: 120, maxDistance: 0, maxUrls: 100
    }, { responseType: 'text' });
});

test('filters old URL limits from history and reveals an invalid hidden setting', () => {
    localStorage.setItem('crawl_urls_history', JSON.stringify(['1000', '25']));
    const post = jest.spyOn(axiosInstance, 'post');
    render(<App />);
    const input = setCrawlUrl();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    const urls = screen.getByLabelText(/Max URLs/);
    const history = document.getElementById(urls.getAttribute('list')!)!;
    expect(history.querySelector('option[value="25"]')).not.toBeNull();
    expect(history.querySelector('option[value="1000"]')).toBeNull();

    fireEvent.change(urls, { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hide Advanced' }));
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByLabelText(/Max URLs/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Max URLs must be a whole number from 1 to 100.');
    expect(post).not.toHaveBeenCalled();
});

test('explains the shared crawl limit when the server returns HTTP 429', async () => {
    jest.spyOn(axiosInstance, 'post').mockRejectedValueOnce({
        isAxiosError: true, response: { status: 429 }
    });
    render(<App />);
    setCrawlUrl();
    fireEvent.click(screen.getByRole('button', { name: 'Start Crawl' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait a minute and try again.');
    expect(screen.getByRole('button', { name: 'Start Crawl' })).toBeEnabled();
});

test('rejects a search query longer than 256 characters before sending it', () => {
    const get = jest.spyOn(axiosInstance, 'get');
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Enter a keyword/), {
        target: { value: 'x'.repeat(257) }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Use a search query of 256 characters or fewer.');
    expect(get).not.toHaveBeenCalled();
});

test('shows a search outage without retrying it as a cold start', async () => {
    const adapter: jest.MockedFunction<AxiosAdapter> = jest.fn(async config => {
        throw new AxiosError('Service Unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
            config,
            data: { status: 503, error: 'Service Unavailable', path: '/api/search' },
            status: 503,
            statusText: 'Service Unavailable',
            headers: {}
        });
    });
    const client = createApiClient({ adapter, maxAttempts: 3, retryDelayMs: 1 });
    jest.spyOn(axiosInstance, 'get').mockImplementation(client.get);

    const waking = jest.fn();
    window.addEventListener('serverWakingUp', waking);
    try {
        render(<App />);
        fireEvent.change(screen.getByLabelText(/Enter a keyword/), { target: { value: 'Andorra' } });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Search is temporarily unavailable.');
        expect(adapter).toHaveBeenCalledTimes(1);
        expect(waking).not.toHaveBeenCalled();
        expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    } finally {
        window.removeEventListener('serverWakingUp', waking);
    }
});

test('offers a runnable example in Help without starting a crawl', () => {
    const post = jest.spyOn(axiosInstance, 'post');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Try the search demo' }));
    expect(dialog.getByText('https://www.scrapethissite.com/pages/simple/')).toBeInTheDocument();
    expect(dialog.getByText('Andorra')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
});