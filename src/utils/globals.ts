class Globals {
    public api!: {
        crawl: string;
        getCrawlStatus: string;
        search: string;
    };
}

export class DevelopmentGlobals extends Globals {
    // Dynamically get the host to support localhost and local network IP testing
    private static host = window.location.hostname;
    
    constructor() {
        super();
        this.api = {
            crawl: `http://${DevelopmentGlobals.host}:8080/api/crawl`,
            getCrawlStatus: `http://${DevelopmentGlobals.host}:8080/api/crawl`,
            search: `http://${DevelopmentGlobals.host}:8080/api/search`,
        };
    }
}

export class ProductionGlobals extends Globals {
    constructor() {
        super();
        this.api = {
            crawl: 'https://search.runmydocker-app.com/api/crawl',
            getCrawlStatus: 'https://search.runmydocker-app.com/api/crawl',
            search: 'https://search.runmydocker-app.com/api/search',
        };
    }
}

const globals = process.env.NODE_ENV === 'production'
    ? new ProductionGlobals()
    : new DevelopmentGlobals();

export default globals;