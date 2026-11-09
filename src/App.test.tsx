import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import App from './App';
import axiosInstance from './utils/axiosInstance';
import globals from './utils/globals';

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(axiosInstance, 'get').mockResolvedValue({ data: [] });
  jest.spyOn(axiosInstance, 'post').mockResolvedValue({ data: 'test-crawl' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders crawl and search controls without sending requests', () => {
  const backgroundGet = jest.spyOn(axios, 'get');
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Web Search Engine' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Start Crawl' })
  ).toBeEnabled();
  expect(
    screen.getByRole('button', { name: /^Search$/ })
  ).toBeEnabled();
  expect(screen.queryByText('No results found.')).not.toBeInTheDocument();

  expect(axiosInstance.get).not.toHaveBeenCalled();
  expect(axiosInstance.post).not.toHaveBeenCalled();
  expect(backgroundGet).not.toHaveBeenCalled();
});

test('warms the production backend once without showing a waiting message', async () => {
  const backgroundGet = jest.spyOn(axios, 'get').mockRejectedValue(new Error('Unavailable'));
  const originalEnvironment = process.env;

  try {
    process.env = { ...originalEnvironment, NODE_ENV: 'production' };
    const { rerender } = render(<App />);
    rerender(<App />);
    await act(async () => {});

    expect(backgroundGet).toHaveBeenCalledTimes(1);
    expect(backgroundGet).toHaveBeenCalledWith(
      new URL('/actuator/health', globals.api.search).toString(),
      { timeout: 10000 }
    );
    expect(screen.queryByText(/Waiting for the demo server/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  } finally {
    process.env = originalEnvironment;
  }
});

test('rejects a whitespace-only crawl URL without contacting the backend', () => {
  render(<App />);

  fireEvent.change(screen.getByPlaceholderText('URL'), {
    target: { value: '   ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start Crawl' }));

  expect(
    screen.getByText('Please enter a URL to crawl.')
  ).toBeInTheDocument();
  expect(axiosInstance.post).not.toHaveBeenCalled();
});

test('does not search or show empty results for a whitespace-only query', () => {
  render(<App />);

  fireEvent.change(screen.getByPlaceholderText('Search Query'), {
    target: { value: '   ' }
  });
  fireEvent.click(
    screen.getByRole('button', { name: /^Search$/ })
  );

  expect(axiosInstance.get).not.toHaveBeenCalled();
  expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
});

test('shows a search failure without showing an empty result', async () => {
  jest.spyOn(axiosInstance, 'get').mockRejectedValueOnce(new Error('Unavailable'));
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Enter a keyword/), {
    target: { value: 'Andorra' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch search results');
  expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
});

test('shows an empty result after a successful search with no matches', async () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Enter a keyword/), {
    target: { value: '  no matches  ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByText('No results found.')).toBeInTheDocument();
  expect(axiosInstance.get).toHaveBeenCalledWith(expect.any(String), {
    params: { query: 'no matches' }
  });
});

test('blocks a second crawl submission while the first is pending', () => {
  jest.spyOn(axiosInstance, 'post').mockImplementationOnce(() => new Promise(() => {}));
  render(<App />);

  const url = screen.getByPlaceholderText('URL');
  const form = url.closest('form')!;
  fireEvent.change(url, { target: { value: 'example.com' } });
  fireEvent.submit(form);
  fireEvent.submit(form);

  expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
});