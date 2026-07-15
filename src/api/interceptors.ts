export interface RequestInterceptor {
  onBeforeRequest?: (url: string, options: RequestInit) => RequestInit | Promise<RequestInit>;
}

export interface ResponseInterceptor {
  onResponse?: (response: Response) => Response | Promise<Response>;
  onError?: (error: any) => any | Promise<any>;
}

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  useRequest(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter((i) => i !== interceptor);
    };
  }

  useResponse(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter((i) => i !== interceptor);
    };
  }

  async runRequestInterceptors(url: string, options: RequestInit): Promise<RequestInit> {
    let currentOptions = { ...options };
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onBeforeRequest) {
        currentOptions = await interceptor.onBeforeRequest(url, currentOptions);
      }
    }
    return currentOptions;
  }

  async runResponseInterceptors(response: Response): Promise<Response> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        currentResponse = await interceptor.onResponse(currentResponse);
      }
    }
    return currentResponse;
  }

  async runErrorInterceptors(error: any): Promise<never> {
    let currentError = error;
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onError) {
        try {
          currentError = await interceptor.onError(currentError);
        } catch (newError) {
          currentError = newError;
        }
      }
    }
    throw currentError;
  }
}
