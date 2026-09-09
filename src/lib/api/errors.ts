import { NextResponse } from "next/server";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_REQUIRED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "SERVER_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_REQUIRED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NETWORK_ERROR: 503,
  SERVER_ERROR: 500
};

const defaultMessageByCode: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  AUTHENTICATION_REQUIRED: "Bạn cần đăng nhập để tiếp tục.",
  PERMISSION_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  CONFLICT: "Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.",
  NETWORK_ERROR: "Kết nối mạng không ổn định. Vui lòng thử lại.",
  SERVER_ERROR: "Hệ thống đang gặp lỗi. Vui lòng thử lại sau."
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message = defaultMessageByCode[code], details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: AppErrorCode;
    message: string;
  };
}

export function toApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("SERVER_ERROR");
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  const apiError = toApiError(error);

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: apiError.code,
        message: apiError.message
      }
    },
    { status: apiError.status }
  );
}
