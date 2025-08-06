export interface CrawlStatus {
    distance: number;
    startTime: string;
    lastModified: string;
    stopReason: string | null;
    numPages: number;
}