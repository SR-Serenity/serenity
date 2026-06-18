import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

function isStream(value: object): boolean {
  return typeof (value as { pipe?: unknown }).pipe === 'function';
}

type ErrorPayload = {
  message: string;
  code: string;
  details?: unknown;
};

function extractMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data !== 'object') {
    return null;
  }

  const message = (data as { message?: unknown }).message;
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((part): part is string => typeof part === 'string').join(', ');
  }

  return null;
}

function getStatus(error: AxiosError): number {
  if (error.response?.status) {
    return error.response.status;
  }

  if (error.code === 'ECONNABORTED') {
    return HttpStatus.GATEWAY_TIMEOUT;
  }

  return HttpStatus.BAD_GATEWAY;
}

export function mapProxyError(error: unknown, upstreamName: string): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = getStatus(error);
    const upstreamData = error.response?.data;
    const fallbackMessage = `${upstreamName} request failed`;

    const payload: ErrorPayload = {
      message: extractMessage(upstreamData) ?? fallbackMessage,
      code:
        status >= 500
          ? 'UPSTREAM_SERVICE_ERROR'
          : `UPSTREAM_${status}`,
    };

    if (typeof upstreamData === 'object' && upstreamData && !isStream(upstreamData)) {
      payload.details = upstreamData;
    }

    return new HttpException(payload, status);
  }

  return new HttpException(
    {
      message: `${upstreamName} request failed`,
      code: 'UPSTREAM_UNKNOWN_ERROR',
    },
    HttpStatus.BAD_GATEWAY
  );
}
