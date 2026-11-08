import axios, { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';

interface ClientOptions {
    adapter?: AxiosAdapter;
    maxAttempts?: number;
    retryDelayMs?: number;
    wakeTimeoutMs?: number;
}

const isHtml = (data: unknown): boolean =>
    typeof data === 'string' && /^\s*(?:<!doctype\s+html|<html\b)/i.test(data);

const isTransient = (error: unknown): boolean => {
    if (axios.isCancel(error) || !axios.isAxiosError(error)) return false;
    // A Spring search error means the application is awake but search is unavailable.
    if (error.response?.status === 503
        && error.response.data?.status === 503
        && error.response.data?.path === '/api/search') {
        return false;
    }
    return error.response
        ? [502, 503, 504].includes(error.response.status)
        : ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code || '');
};

const delay = (milliseconds: number, signal: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        const cancel = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', cancel);
            reject(new axios.CanceledError());
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', cancel);
            resolve();
        }, milliseconds);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
    });

export const createApiClient = (options: ClientOptions = {}) => {
    const maxAttempts = options.maxAttempts ?? 10;
    const retryDelayMs = options.retryDelayMs ?? 2000;
    const wakeTimeoutMs = options.wakeTimeoutMs ?? 30000;
    const transport = axios.create({ timeout: 10000, adapter: options.adapter });
    const client = axios.create({ timeout: 10000 });
    let waitingRequests = 0;

    const readWithRetry = async (
        config: AxiosRequestConfig,
        healthCheck = false
    ): Promise<AxiosResponse> => {
        const controller = new AbortController();
        const cancel = () => controller.abort();
        config.signal?.addEventListener?.('abort', cancel);
        if (config.signal?.aborted) controller.abort();
        const deadlineTimer = setTimeout(cancel, wakeTimeoutMs);
        const deadline = Date.now() + wakeTimeoutMs;
        let waiting = false;

        try {
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                if (controller.signal.aborted) throw new axios.CanceledError();
                try {
                    const response = await transport.request({
                        ...config,
                        adapter: transport.defaults.adapter,
                        signal: controller.signal,
                        timeout: Math.max(1, Math.min(config.timeout || 10000, deadline - Date.now()))
                    });
                    if (!isHtml(response.data) && (!healthCheck || response.data?.status === 'UP')) {
                        return response;
                    }
                } catch (error) {
                    if (!isTransient(error)) throw error;
                }

                if (attempt === maxAttempts || Date.now() >= deadline) break;
                if (!waiting) {
                    waiting = true;
                    waitingRequests += 1;
                    if (waitingRequests === 1) window.dispatchEvent(new Event('serverWakingUp'));
                }
                await delay(Math.min(retryDelayMs, Math.max(1, deadline - Date.now())), controller.signal);
            }
            throw new Error('The server did not become ready within the waiting limit.');
        } catch (error) {
            if (controller.signal.aborted && !config.signal?.aborted) {
                throw new Error('The server did not become ready within the waiting limit.');
            }
            throw error;
        } finally {
            clearTimeout(deadlineTimer);
            config.signal?.removeEventListener?.('abort', cancel);
            if (waiting) {
                waitingRequests -= 1;
                if (waitingRequests === 0) window.dispatchEvent(new Event('serverAwake'));
            }
        }
    };

    client.defaults.adapter = async config => {
        const method = (config.method || 'get').toLowerCase();
        if (method === 'get' || method === 'head') return readWithRetry(config);

        // Probe readiness before a write. The write itself is sent only once.
        const target = new URL(config.url || '', config.baseURL || window.location.origin);
        await readWithRetry({
            url: new URL('/actuator/health', target).toString(),
            method: 'get',
            signal: config.signal,
            headers: { Accept: 'application/json' }
        }, true);

        const response = await transport.request({ ...config, adapter: transport.defaults.adapter });
        if (isHtml(response.data)) {
            throw new Error('The server returned an unexpected page. The action was not sent again.');
        }
        return response;
    };

    return client;
};

export default createApiClient();