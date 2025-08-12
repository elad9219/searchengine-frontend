export interface CrawlStatus {
    distance: number;
    startTimeMillis?: number;
    lastModifiedMillis?: number;
    maxTimeMillis?: number;
    stopReason?: string | null;
    numPages?: number;
    status?: string;
}
