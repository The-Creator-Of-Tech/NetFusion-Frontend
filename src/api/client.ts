import { ApiError, NetworkError, TimeoutError, ValidationError } from './errors';
import { InterceptorManager } from './interceptors';

export interface ClientConfig {
  baseURL?: string;
  timeout?: number; // ms
  retry?: {
    maxRetries: number;
    initialDelay: number; // ms
    statusCodes?: number[];
  };
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retry?: {
    maxRetries: number;
    initialDelay: number;
    statusCodes?: number[];
  };
}

export class ApiClient {
  private config: ClientConfig;
  public interceptors = new InterceptorManager();

  constructor(config: ClientConfig = {}) {
    this.config = {
      timeout: 10000, // 10s default
      retry: {
        maxRetries: 3,
        initialDelay: 100, // 100ms
        statusCodes: [500, 502, 503, 504],
      },
      ...config,
    };
  }

  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const mergedOptions = { ...options };
    const timeout = mergedOptions.timeout ?? this.config.timeout ?? 10000;
    const retryConfig = { ...this.config.retry, ...mergedOptions.retry };

    // Resolve URL
    let fullURL = url;
    if (this.config.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
      const base = this.config.baseURL.replace(/\/$/, '');
      const path = url.replace(/^\//, '');
      fullURL = `${base}/${path}`;
    }

    // Run request interceptors
    const finalOptions = await this.interceptors.runRequestInterceptors(fullURL, mergedOptions);

    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const signal = controller.signal;
      let timeoutId: any = null;

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort('timeout');
        }, timeout);
      }

      try {
        let response: Response;
        try {
          response = await fetch(fullURL, {
            ...finalOptions,
            signal,
          });
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError' || signal.aborted) {
            throw new TimeoutError(`Request to ${fullURL} timed out after ${timeout}ms`);
          }
          throw new NetworkError(`Network connection failed: ${fetchError.message}`);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        const interceptedResponse = await this.interceptors.runResponseInterceptors(response);

        if (!interceptedResponse.ok) {
          const status = interceptedResponse.status;
          let errorData: any = null;
          try {
            const contentType = interceptedResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              errorData = await interceptedResponse.json();
            } else {
              errorData = await interceptedResponse.text();
            }
          } catch (e) {
            // Ignore parsing error
          }

          const shouldRetryStatus = retryConfig.statusCodes?.includes(status) ?? false;
          if (shouldRetryStatus && attempt < (retryConfig.maxRetries ?? 0)) {
            attempt++;
            const backoff = (retryConfig.initialDelay ?? 100) * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }

          if (status === 400 && errorData && typeof errorData === 'object' && errorData.errors) {
            throw new ValidationError(
              errorData.message || 'Validation failed',
              status,
              errorData.errors,
              errorData
            );
          }

          throw new ApiError(
            errorData?.message || `Request failed with status ${status}`,
            status,
            errorData
          );
        }

        const contentType = interceptedResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return (await interceptedResponse.json()) as T;
        } else {
          return (await interceptedResponse.text()) as unknown as T;
        }

      } catch (error: any) {
        const isConnError = error instanceof NetworkError;
        if (isConnError && attempt < (retryConfig.maxRetries ?? 0)) {
          attempt++;
          const backoff = (retryConfig.initialDelay ?? 100) * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        return await this.interceptors.runErrorInterceptors(error);
      }
    }
  }

  async upload<T>(url: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const headers = { ...options.headers } as Record<string, string>;
    if (headers) {
      const keysToDelete = Object.keys(headers).filter((k) => k.toLowerCase() === 'content-type');
      for (const key of keysToDelete) {
        delete headers[key];
      }
    }
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    });
  }

  async download(url: string, options: RequestOptions = {}): Promise<Blob> {
    let fullURL = url;
    if (this.config.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
      const base = this.config.baseURL.replace(/\/$/, '');
      const path = url.replace(/^\//, '');
      fullURL = `${base}/${path}`;
    }
    const finalOptions = await this.interceptors.runRequestInterceptors(fullURL, {
      ...options,
      method: 'GET',
    });
    const responseObj = await fetch(fullURL, finalOptions);
    if (!responseObj.ok) {
      throw new ApiError(`Download failed with status ${responseObj.status}`, responseObj.status);
    }
    return await responseObj.blob();
  }
}
export const defaultClient = new ApiClient();
