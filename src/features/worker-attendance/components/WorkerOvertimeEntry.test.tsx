import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { WorkerOvertimeEntry } from "./WorkerOvertimeEntry";
import { enqueueWorkerOvertime } from "../client/workerOvertimeQueue";
const id="11111111-1111-4111-8111-111111111111";
vi.mock("@/components/providers/CurrentUserProvider",()=>({useCurrentUser:()=>({id:"11111111-1111-4111-8111-111111111111"})}));
vi.mock("../client/workerOvertimeQueue",()=>({enqueueWorkerOvertime:vi.fn(),readWorkerOvertimeQueue:()=>[],syncWorkerOvertimeQueue:vi.fn(async()=>[])}));
const task={projectId:id,projectName:"Gói A",worksiteId:id,worksiteName:"Khu A",date:"2026-11-13",shiftCode:"PORT_GENERAL",shiftName:"Cảng tổng hợp",roster:[{workerId:id,workerName:"Công nhân A",employeeCode:"CN1",assignmentRole:"worker"}]};
beforeEach(()=>{vi.clearAllMocks();Object.defineProperty(navigator,"onLine",{configurable:true,value:false});});
afterEach(cleanup);
it("records early overtime and a break offline without repeating normal attendance",async()=>{
 render(<WorkerOvertimeEntry task={task} initialWorkerIds={[id]} onSaved={vi.fn()}/>);fireEvent.click(screen.getByRole("button",{name:"Ghi tăng ca"}));
 fireEvent.change(screen.getByLabelText(/^Bắt đầu[\\s*]*$/),{target:{value:"05:00"}});fireEvent.change(screen.getByLabelText(/^Kết thúc[\\s*]*$/),{target:{value:"07:00"}});
 fireEvent.click(screen.getByLabelText(/^Có nghỉ giữa giờ/));fireEvent.change(screen.getByLabelText(/^Bắt đầu nghỉ/),{target:{value:"05:30"}});fireEvent.change(screen.getByLabelText(/^Làm tiếp/),{target:{value:"05:45"}});
 expect(screen.getByText("1 giờ 45 phút")).toBeInTheDocument();fireEvent.click(screen.getByLabelText(/^Đã xác nhận người tham gia đồng ý tăng ca/));fireEvent.click(screen.getByRole("button",{name:"Lưu tăng ca"}));
 await waitFor(()=>expect(enqueueWorkerOvertime).toHaveBeenCalledOnce());expect(vi.mocked(enqueueWorkerOvertime).mock.calls[0][0]).toMatchObject({workerIds:[id],checkedInAt:"2026-11-13T05:00:00+07:00",checkedOutAt:"2026-11-13T07:00:00+07:00",breakStartedAt:"2026-11-13T05:30:00+07:00",breakEndedAt:"2026-11-13T05:45:00+07:00"});
});
