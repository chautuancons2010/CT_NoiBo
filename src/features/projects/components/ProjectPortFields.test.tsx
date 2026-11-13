import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProjectPortFields } from "./ProjectPortFields";
import { projectInputSchema } from "../schemas/projectSchemas";

afterEach(cleanup);
it("previews the configured shift version for the package start date",()=>{
 const {container}=render(<ProjectPortFields date="2026-11-20" schedules={[{code:"PORT_GENERAL",name:"Cảng tổng hợp",startTime:"07:30",endTime:"17:00",versions:[{effectiveFrom:"2026-11-20",name:"Cảng tổng hợp",startTime:"07:00",endTime:"16:30",breakStartTime:"11:30",breakEndTime:"13:00"}]}]}/>);
 fireEvent.change(container.querySelector('select[name="portShiftCode"]')!,{target:{value:"PORT_GENERAL"}});
 expect(screen.getByText("07:00–11:30 · 13:00–16:30")).toBeInTheDocument();expect(screen.getByText("06:50")).toBeInTheDocument();
});
it("creates a package without choosing or assigning a port",()=>{
 const base={code:"PACKAGE1",name:"Gói mới",startDate:"2026-11-13"};
 expect(projectInputSchema.safeParse(base).success).toBe(true);
 expect(projectInputSchema.parse({...base,portShiftCode:"PORT_GENERAL"})).not.toHaveProperty("portShiftCode");
});
it("shows each port's hours and the mandatory ten-minute arrival deadline",()=>{
 const {container}=render(<form><ProjectPortFields/></form>);
 const select=container.querySelector('select[name="portShiftCode"]')!;
 expect(select).toHaveValue("");expect(select).toBeRequired();
 fireEvent.change(select,{target:{value:"PORT_SPECIALIZED"}});
 expect(screen.getByText("08:00–11:30 · 13:00–17:00")).toBeInTheDocument();expect(screen.getByText("07:50")).toBeInTheDocument();
 fireEvent.change(select,{target:{value:"PORT_GENERAL"}});
 expect(screen.getByText("07:30–11:30 · 13:00–17:00")).toBeInTheDocument();expect(screen.getByText("07:20")).toBeInTheDocument();
 expect(screen.getByText("1 công · 8 giờ")).toBeInTheDocument();
});
