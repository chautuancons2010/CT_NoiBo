import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSharedShiftCatalog } from "./attendanceShiftService";

const shift = { id: "port", code: "PORT_GENERAL", start_time: "07:30", end_time: "17:00", active: true };
const assignment = { id: "one", shift_id: "port", scope_type: "project", scope_id: "package", effective_from: "2026-11-13", weekdays: [1,2,3,4,5,6] };
function client(calendar: Record<string,unknown>[] = []) {
  const tables: Record<string,unknown[]> = { shifts: [shift, { id: "specialized", code: "PORT_SPECIALIZED", name: "Cảng chuyên dụng", start_time: "08:00", end_time: "17:00", active: true }], shift_assignments: [assignment], shift_versions: [{ shift_id:"port", effective_from:"2026-11-13", schedule_rules:{breakStartTime:"11:30",breakEndTime:"13:00",arrivalLeadMinutes:15} }], work_calendar_days: calendar };
  return { from: (table: string) => {
    const chain = { select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain, or: () => chain, order: () => chain, then: (resolve: (value: unknown) => void) => Promise.resolve({data:tables[table],error:null}).then(resolve) };
    return chain;
  } } as unknown as SupabaseClient;
}
const scope = { employeeId:"worker", projectIds:["package"] };
describe("port schedules and day overrides", () => {
  it("uses the supervisor's selected port ahead of the package's legacy assignment", async () => {
    const resolve = await readSharedShiftCatalog(client(), "2026-11-13");
    expect(resolve({ ...scope, selectedPortCode: "PORT_SPECIALIZED" })).toMatchObject({ code: "PORT_SPECIALIZED", start_time: "08:00", is_working_day: true });
    expect(resolve(scope)).toMatchObject({ code: "PORT_GENERAL", start_time: "07:30" });
    expect(resolve({ ...scope, selectedPortCode: "UNKNOWN" })).toBeUndefined();
  });
  it("resolves each date from a month catalog without leaking a holiday or an earlier arrival rule",async()=>{
    const resolve=await readSharedShiftCatalog(client([{id:"holiday",calendar_date:"2026-11-13",scope_type:"company",is_working_day:false,day_type:"holiday"}]),"2026-11-15","2026-11-12");
    expect(resolve({...scope,date:"2026-11-13"})).toMatchObject({is_working_day:false,schedule_rules:{arrivalLeadMinutes:10}});
    expect(resolve({...scope,date:"2026-11-14"})).toMatchObject({is_working_day:true,schedule_rules:{arrivalLeadMinutes:10}});
    expect(resolve({...scope,date:"2026-11-15"})).toMatchObject({is_working_day:false});
  });
  it("keeps the assigned port hours on Sunday while marking it a rest day", async () => {
    const resolve = await readSharedShiftCatalog(client(),"2026-11-15");
    expect(resolve(scope)).toMatchObject({code:"PORT_GENERAL",start_time:"07:30",is_working_day:false});
  });
  it("allows regular attendance on a Sunday explicitly designated as makeup work", async () => {
    const resolve = await readSharedShiftCatalog(client([{id:"day",calendar_date:"2026-11-15",scope_type:"project",scope_id:"package",is_working_day:true,day_type:"makeup_workday"}]),"2026-11-15");
    expect(resolve(scope)).toMatchObject({is_working_day:true,calendar_day_type:"makeup_workday"});
  });
  it("marks a weekday holiday separately and honors a personal calendar override", async () => {
    const holiday = {id:"holiday",calendar_date:"2026-11-13",scope_type:"company",is_working_day:false,day_type:"holiday"};
    const resolve = await readSharedShiftCatalog(client([holiday]),"2026-11-13");
    expect(resolve(scope)).toMatchObject({is_working_day:false,calendar_day_type:"holiday"});
    const personal = await readSharedShiftCatalog(client([holiday,{id:"personal",calendar_date:"2026-11-13",scope_type:"employee",scope_id:"worker",is_working_day:true,day_type:"makeup_workday"}]),"2026-11-13");
    expect(personal(scope)?.is_working_day).toBe(true);
  });
});
