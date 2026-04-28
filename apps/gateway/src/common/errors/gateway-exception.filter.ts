import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

type RequestLike = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type GatewayErrorResponse = {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
  details?: unknown;
};

function inferCode(statusCode: number): string {
  if (statusCode === HttpStatus.BAD_REQUEST) {
    return 'BAD_REQUEST';
  }
  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return 'UNAUTHORIZED';
  }
  if (statusCode === HttpStatus.FORBIDDEN) {
    return 'FORBIDDEN';
  }
  if (statusCode === HttpStatus.NOT_FOUND) {
    return 'NOT_FOUND';
  }
  if (statusCode === HttpStatus.CONFLICT) {
    return 'CONFLICT';
  }
  if (statusCode >= 500) {
    return 'INTERNAL_ERROR';
  }
  return `HTTP_${statusCode}`;
}

function parseException(exception: unknown): {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
} {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
      };
    }

    if (typeof response === 'object' && response) {
      const payload = response as {
        message?: unknown;
        error?: unknown;
        code?: unknown;
        details?: unknown;
      };

      const message =
        typeof payload.message === 'string'
          ? payload.message
          : Array.isArray(payload.message)
            ? payload.message.filter((item): item is string => typeof item === 'string').join(', ')
            : typeof payload.error === 'string'
              ? payload.error
              : exception.message;

      return {
        statusCode,
        message,
        code: typeof payload.code === 'string' ? payload.code : undefined,
        details: payload.details,
      };
    }

    return {
      statusCode,
      message: exception.message,
    };
  }

  if (exception instanceof Error) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception.message,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Unexpected error',
  };
}

@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GatewayExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestLike>();
    const response = ctx.getResponse<ResponseLike>();

    const parsed = parseException(exception);
    const isProduction = process.env.NODE_ENV === 'production';
    const safeMessage = parsed.statusCode >= 500 && isProduction
      ? 'Something went wrong. Please try again later.'
      : parsed.message;

    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();

    const body: GatewayErrorResponse = {
      success: false,
      statusCode: parsed.statusCode,
      code: parsed.code ?? inferCode(parsed.statusCode),
      message: safeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (!isProduction && parsed.details !== undefined) {
      body.details = parsed.details;
    }

    if (parsed.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${parsed.statusCode} (${requestId})`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.setHeader('x-request-id', requestId);
    response.status(parsed.statusCode).json(body);
  }
}
