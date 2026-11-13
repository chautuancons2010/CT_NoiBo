import { z } from "zod";
import { uploadWorkerPhoto } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { AppError, errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
const paramsSchema = z.object({ id: z.string().uuid() });
export async function POST(request: Request, context: RouteContext<"/api/v1/worker-attendance/sessions/[id]/photos">) {
  try { const user = requireAuthenticatedUser(await getRequestUser()); const { id } = parseWithSchema(paramsSchema, await context.params); const form = await request.formData(); const photo = form.get("photo"); const thumbnail = form.get("thumbnail"); if (!(photo instanceof File) || !(thumbnail instanceof File)) throw new AppError("PHOTO_UPLOAD", "Thiếu ảnh điểm danh."); return successResponse(await uploadWorkerPhoto(user, id, { photoId: z.string().uuid().parse(String(form.get("photoId"))), checkpoint: form.has("checkpoint") ? z.enum(["start","middle","end"]).parse(form.get("checkpoint")) : undefined, photo, thumbnail, purpose: form.has("purpose") ? z.enum(["rain_pause"]).parse(form.get("purpose")) : undefined, workBatchId: form.has("workBatchId") ? z.string().uuid().parse(form.get("workBatchId")) : undefined, width: Number(form.get("width")), height: Number(form.get("height")), capturedAt: z.string().datetime({ offset: true }).parse(String(form.get("capturedAt"))), address: form.get("address") ? z.string().trim().max(1000).parse(form.get("address")) : undefined, latitude: form.has("latitude") ? z.coerce.number().min(-90).max(90).parse(form.get("latitude")) : undefined, longitude: form.has("longitude") ? z.coerce.number().min(-180).max(180).parse(form.get("longitude")) : undefined, accuracy: form.has("accuracy") ? z.coerce.number().nonnegative().parse(form.get("accuracy")) : undefined })); }
  catch (error) { return errorResponse(error); }
}
