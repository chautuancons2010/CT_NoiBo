import {act,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {GlobalLoadingIndicator} from "./GlobalLoadingIndicator";
import {beginLoadingActivity} from "@/lib/ui/loadingActivity";
let releases:Array<()=>void>=[];
beforeEach(()=>{vi.useFakeTimers();releases=[];});
afterEach(()=>{act(()=>{releases.forEach(release=>release());vi.runOnlyPendingTimers();});vi.useRealTimers();});
function begin(kind:"page"|"action"){let release=()=>{};act(()=>{release=beginLoadingActivity(kind);});releases.push(release);return release;}
describe("nonblocking navigation loading",()=>{
 it("keeps background actions and fast navigation from flashing a global indicator",()=>{
  render(<GlobalLoadingIndicator/>);const action=begin("action");act(()=>vi.advanceTimersByTime(300));expect(screen.queryByRole("status")).not.toBeInTheDocument();
  const page=begin("page");act(()=>vi.advanceTimersByTime(80));act(()=>page());act(()=>vi.advanceTimersByTime(300));expect(screen.queryByRole("status")).not.toBeInTheDocument();act(()=>action());
 });
 it("announces a slower navigation and waits for every concurrent page operation",()=>{
  render(<GlobalLoadingIndicator/>);const first=begin("page"),second=begin("page");act(()=>vi.advanceTimersByTime(200));expect(screen.getByRole("status",{name:"Đang mở trang"})).toBeInTheDocument();
  act(()=>first());expect(screen.getByRole("status",{name:"Đang mở trang"})).toBeInTheDocument();act(()=>second());expect(screen.queryByRole("status")).not.toBeInTheDocument();
 });
});
