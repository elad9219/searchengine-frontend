import React from 'react';
import { render, screen } from '@testing-library/react';
import SearchResults from './SearchResults';

test('renders emphasis while keeping all other markup as escaped text', () => {
    const { container } = render(<SearchResults searchPerformed results={[{
        url: 'https://example.com/article',
        snippet: '<img src=x onerror=alert(1)><em>Andorra</em><script>alert(2)</script>'
    }]} />);
    expect(container.querySelector('em')).toHaveTextContent('Andorra');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/article');
});

test.each(['javascript:alert(1)', 'data:text/html,unsafe', '/relative-path'])(
    'does not create a clickable link for %s',
    url => {
        render(<SearchResults searchPerformed results={[{ url, snippet: 'Text' }]} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByText(url)).toBeInTheDocument();
    }
);

test('keeps encoded HTML inert', () => {
    const { container } = render(<SearchResults searchPerformed results={[{
        url: 'https://example.com/article',
        snippet: '&lt;img src=x onerror=alert(1)&gt;'
    }]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('&lt;img');
});

test('does not show results before a search', () => {
    const { container } = render(<SearchResults searchPerformed={false} results={[]} />);
    expect(container).toBeEmptyDOMElement();
});