import axios, { AxiosAdapter, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { createApiClient } from './axiosInstance';

const response = (config: AxiosRequestConfig, data: unknown): AxiosResponse => ({
    config: config as AxiosResponse['config'],
    data,
    status: 200,
    statusText: 'OK',
    headers: {}
});

const failure = (config: AxiosRequestConfig, status?: number): AxiosError =>
    new AxiosError('Unavailable', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
        config as AxiosResponse['config'], undefined,
        status ? { ...response(config, {}), status } : undefined);

const options = { maxAttempts: 3, retryDelayMs: 1, wakeTimeoutMs: 1000 };

test('recovers from HTML and network errors on reads and clears the waiting state', async () => {
    let calls = 0;
    const adapter: AxiosAdapter = async config => {
        calls += 1;
        if (calls === 1) return response(config, '<!doctype html><html>Starting</html>');
        if (calls === 2) throw failure(config);
        return response(config, []);
    };
    const waking = jest.fn();
    const awake = jest.fn();
    window.addEventListener('serverWakingUp', waking);
    window.addEventListener('serverAwake', awake);
    try {
        const client = createApiClient({ ...options, adapter });
        expect((await client.get('http://localhost/api/search')).data).toEqual([]);
        expect(calls).toBe(3);
        expect(waking).toHaveBeenCalledTimes(1);
        expect(awake).toHaveBeenCalledTimes(1);
    } finally {
        window.removeEventListener('serverWakingUp', waking);
        window.removeEventListener('serverAwake', awake);
    }
});

test('stops retrying and clears the waiting state when attempts are exhausted', async () => {
    const adapter = jest.fn(async config => { throw failure(config, 503); });
    const awake = jest.fn();
    window.addEventListener('serverAwake', awake);
    try {
        await expect(createApiClient({ ...options, adapter }).get('http://localhost/api/search'))
            .rejects.toThrow('waiting limit');
        expect(adapter).toHaveBeenCalledTimes(3);
        expect(awake).toHaveBeenCalledTimes(1);
    } finally {
        window.removeEventListener('serverAwake', awake);
    }
});

test('does not retry an HTTP 400 response', async () => {
    const adapter = jest.fn(async config => { throw failure(config, 400); });
    await expect(createApiClient({ ...options, adapter }).get('http://localhost/api/search'))
        .rejects.toMatchObject({ response: { status: 400 } });
    expect(adapter).toHaveBeenCalledTimes(1);
});

test('does not send a write when readiness cannot be established', async () => {
    const methods: string[] = [];
    const adapter: AxiosAdapter = async config => {
        methods.push(config.method || '');
        throw failure(config, 503);
    };
    await expect(createApiClient({ ...options, adapter }).post('http://localhost/api/crawl', {}))
        .rejects.toThrow();
    expect(methods).toEqual(['get', 'get', 'get']);
});

test.each(['network', 'http', 'html'])('never replays a write after a %s failure', async kind => {
    let writes = 0;
    const adapter: AxiosAdapter = async config => {
        if (config.method === 'get') return response(config, { status: 'UP' });
        writes += 1;
        if (kind === 'html') return response(config, '<html>Unavailable</html>');
        throw failure(config, kind === 'http' ? 503 : undefined);
    };
    await expect(createApiClient({ ...options, adapter }).post('http://localhost/api/crawl', {}))
        .rejects.toThrow();
    expect(writes).toBe(1);
});

test('cancels during the retry delay without sending another request', async () => {
    const controller = new AbortController();
    const adapter = jest.fn(async config => { throw failure(config); });
    const cancel = () => controller.abort();
    window.addEventListener('serverWakingUp', cancel);
    try {
        await expect(createApiClient({ ...options, adapter }).get('http://localhost/api/search', {
            signal: controller.signal
        })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
        expect(adapter).toHaveBeenCalledTimes(1);
    } finally {
        window.removeEventListener('serverWakingUp', cancel);
    }
});

test('enforces a total waiting deadline even when an adapter stays pending', async () => {
    const adapter: AxiosAdapter = async config => new Promise((resolve, reject) => {
        config.signal?.addEventListener?.('abort', () => reject(new axios.CanceledError()));
        if (config.signal?.aborted) reject(new axios.CanceledError());
    });
    await expect(createApiClient({ ...options, adapter, wakeTimeoutMs: 20 })
        .get('http://localhost/api/search')).rejects.toThrow('waiting limit');
});

test('keeps the waiting state active until all waiting requests finish', async () => {
    const calls = new Map<string, number>();
    let release: (() => void) | undefined;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const adapter: AxiosAdapter = async config => {
        const key = config.url || '';
        const count = (calls.get(key) || 0) + 1;
        calls.set(key, count);
        if (count === 1) throw failure(config, 503);
        if (key.endsWith('/slow')) await pending;
        return response(config, []);
    };
    const waking = jest.fn();
    const awake = jest.fn();
    window.addEventListener('serverWakingUp', waking);
    window.addEventListener('serverAwake', awake);
    try {
        const client = createApiClient({ ...options, adapter });
        const slow = client.get('http://localhost/slow');
        await client.get('http://localhost/fast');
        expect(waking).toHaveBeenCalledTimes(1);
        expect(awake).not.toHaveBeenCalled();
        release?.();
        await slow;
        expect(awake).toHaveBeenCalledTimes(1);
    } finally {
        release?.();
        window.removeEventListener('serverWakingUp', waking);
        window.removeEventListener('serverAwake', awake);
    }
});

describe('real Axios browser transport', () => {
    let server: Server;
    let base: string;
    let healthCalls: number;
    let writes: number;
    let failWrite: boolean;

    beforeEach(async () => {
        healthCalls = 0;
        writes = 0;
        failWrite = false;
        server = createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            res.setHeader('Content-Type', 'application/json');
            if (req.url === '/actuator/health') {
                healthCalls += 1;
                res.writeHead(healthCalls === 1 ? 503 : 200);
                res.end(JSON.stringify({ status: healthCalls === 1 ? 'DOWN' : 'UP' }));
                return;
            }
            writes += 1;
            res.writeHead(failWrite ? 503 : 200);
            res.end(JSON.stringify({ accepted: true }));
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    });

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    });

    test('waits for readiness over XHR, then sends one POST', async () => {
        const client = createApiClient({ ...options, adapter: axios.getAdapter('xhr') });
        expect((await client.post(base + '/api/crawl', { url: 'https://example.com' })).data)
            .toEqual({ accepted: true });
        expect(healthCalls).toBe(2);
        expect(writes).toBe(1);
    });

    test('does not replay a POST that receives HTTP 503 over XHR', async () => {
        failWrite = true;
        const client = createApiClient({ ...options, adapter: axios.getAdapter('xhr') });
        await expect(client.post(base + '/api/crawl', {}))
            .rejects.toMatchObject({ response: { status: 503 } });
        expect(writes).toBe(1);
    });
});