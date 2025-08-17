export interface CrawlStatus {
    distance: number;
    startTimeMillis: number;
    lastModifiedMillis: number;
    stopReason: string | null;
    numPages: number;
}
