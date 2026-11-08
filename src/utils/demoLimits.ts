export const crawlLimits = {
    seconds: { min: 1, max: 120, defaultValue: 60 },
    depth: { min: 0, max: 4, defaultValue: 2 },
    urls: { min: 1, max: 100, defaultValue: 25 }
};

export const maxCrawlUrlLength = 2048;
export const maxSearchQueryLength = 256;

export const demoExample = {
    url: 'https://www.scrapethissite.com/pages/simple/',
    query: 'Andorra'
};