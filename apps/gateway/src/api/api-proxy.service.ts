import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { mapProxyError } from '../common/errors/proxy-error.util';

@Injectable()
export class ApiProxyService {
  async forwardGetRequest(
    endpoint: string,
    authHeader?: string,
    params?: Record<string, unknown>
  ) {
    try {
      const response = await axios.get(
        `${this.apiServiceUrl()}/${endpoint}`,
        {
          headers: this.forwardHeaders(authHeader),
          params,
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  async forwardPostRequest(
    endpoint: string,
    body: unknown,
    authHeader?: string
  ) {
    try {
      const response = await axios.post(
        `${this.apiServiceUrl()}/${endpoint}`,
        body,
        {
          headers: this.forwardHeaders(authHeader),
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  async forwardPutRequest(
    endpoint: string,
    body: unknown,
    authHeader?: string
  ) {
    try {
      const response = await axios.put(
        `${this.apiServiceUrl()}/${endpoint}`,
        body,
        {
          headers: this.forwardHeaders(authHeader),
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  async forwardPatchRequest(
    endpoint: string,
    body: unknown,
    authHeader?: string
  ) {
    try {
      const response = await axios.patch(
        `${this.apiServiceUrl()}/${endpoint}`,
        body,
        {
          headers: this.forwardHeaders(authHeader),
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  async forwardDeleteRequest(
    endpoint: string,
    authHeader?: string,
    body?: unknown,
  ) {
    try {
      const response = await axios.delete(
        `${this.apiServiceUrl()}/${endpoint}`,
        {
          headers: this.forwardHeaders(authHeader),
          data: body,
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  async forwardAiPostRequest(
    endpoint: string,
    body: unknown,
    authHeader?: string,
  ) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl()}/${endpoint}`,
        body,
        {
          headers: this.forwardAiHeaders(authHeader),
        },
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'AI service');
    }
  }

  private forwardHeaders(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    return headers;
  }

  private forwardAiHeaders(authHeader?: string) {
    const headers = this.forwardHeaders(authHeader);
    const internalToken = process.env.AI_INTERNAL_API_TOKEN;
    if (internalToken) {
      headers['x-internal-api-token'] = internalToken;
    }
    return headers;
  }

  private apiServiceUrl() {
    return process.env.API_SERVICE_URL ?? 'http://localhost:2993/api';
  }

  private aiServiceUrl() {
    return process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
  }
}
