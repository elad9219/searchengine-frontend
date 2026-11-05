import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import axiosInstance from './utils/axiosInstance';

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(axiosInstance, 'get').mockResolvedValue({ data: [] });
  jest.spyOn(axiosInstance, 'post').mockResolvedValue({ data: 'test-crawl' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders crawl and search controls without sending requests', () => {
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