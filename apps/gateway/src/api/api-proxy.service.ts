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

  async forwardDeleteRequest(endpoint: string, authHeader?: string) {
    try {
      const response = await axios.delete(
        `${this.apiServiceUrl()}/${endpoint}`,
        {
          headers: this.forwardHeaders(authHeader),
        }
      );
      return response.data;
    } catch (error) {
      throw mapProxyError(error, 'API service');
    }
  }

  private forwardHeaders(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    return headers;
  }

  private apiServiceUrl() {
    return process.env.API_SERVICE_URL ?? 'http://localhost:2993/api';
  }
}
