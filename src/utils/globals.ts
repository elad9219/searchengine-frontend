class Globals {}

export class DevelopmentGlobals extends Globals {
    public api = {
        crawl: 'http://localhost:8080/api/crawl',
        getCrawlStatus: 'http://localhost:8080/api/crawl',
        search: 'http://localhost:8080/api/search',
    };
}

export class ProductionGlobals extends Globals {
    public api = {
        crawl: '/api/crawl',
        getCrawlStatus: '/api/crawl',
        search: '/api/search',
    };
}

const globals = process.env.NODE_ENV === 'production'
    ? new ProductionGlobals()
    : new DevelopmentGlobals();

export default globals;