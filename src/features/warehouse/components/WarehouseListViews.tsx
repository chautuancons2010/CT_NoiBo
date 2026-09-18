"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import { ItemImagePreview } from "@/features/warehouse/components/ItemImagePreview";
import type { InventoryBalance, InventoryDocument, InventoryDocumentType, InventoryItem, StockCount, StockLedgerEntry, Warehouse } from "@/features/warehouse/types/warehouseTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

type ApiBody<T>={ok:boolean;data?:T;error?:{message?:string}};
async function api<T>(url:string):Promise<T>{const response=await fetch(url,{cache:"no-store"}),body=await response.json() as ApiBody<T>;if(!response.ok||!body.data)throw new Error(body.error?.message||"Không thể tải dữ liệu.");return body.data;}
function useWarehouseData<T>(url:string){const[data,setData]=useState<T>(),[error,setError]=useState<string>();const load=useCallback(()=>api<T>(url).then((value)=>{setData(value);setError(undefined);return value;}).catch((reason)=>{setError(reason instanceof Error?reason.message:"Không thể tải dữ liệu.");}),[url]);useEffect(()=>{void load();},[load]);useDomainReconciliation("warehouse",load);return{data,error,loading:!data&&!error};}
const number=new Intl.NumberFormat("vi-VN",{maximumFractionDigits:4});
const statusLabels:Record<string,string>={draft:"Nháp",submitted:"Đã gửi",posted:"Đã ghi sổ",cancelled:"Đã hủy",reversed:"Đã đảo",counting:"Đang kiểm",reviewed:"Đã đối chiếu",active:"Hoạt động",inactive:"Ngừng dùng",in_stock:"Còn hàng",low_stock:"Sắp hết",out_of_stock:"Hết hàng"};
function badge(value:string){const tone:StatusBadgeTone=value==="posted"||value==="active"||value==="in_stock"?"success":value==="low_stock"||value==="submitted"||value==="reviewed"?"warning":value==="out_of_stock"||value==="cancelled"?"error":"neutral";return <StatusBadge tone={tone}>{statusLabels[value]??value}</StatusBadge>;}
const typeConfig:Record<Exclude<InventoryDocumentType,"reversal">,{label:string;path:string}>={receipt:{label:"Nhập kho",path:"receipts"},issue:{label:"Xuất kho",path:"issues"},transfer:{label:"Chuyển kho",path:"transfers"},adjustment:{label:"Điều chỉnh",path:"adjustments"}};

export function ItemListView({ canManage = false }: { canManage?: boolean }) {
  const [search, setSearch] = useState("");
  const { data = [], error, loading } = useWarehouseData<InventoryItem[]>("/api/v1/items");
  const filtered = useMemo(
    () => data.filter((row) => `${row.itemCode} ${row.name}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))),
    [data, search]
  );
  const columns: DataTableColumn<InventoryItem>[] = [
    { id: "image", header: "Ảnh", cell: (row) => <ItemImagePreview assetId={row.imageAssetId} itemName={row.name} />, align: "center" },
    { id: "code", header: "Mã hàng", cell: (row) => <Link className="text-link" href={`/warehouse/items/${row.id}`}>{row.itemCode}</Link> },
    { id: "name", header: "Tên hàng", accessor: "name" },
    { id: "category", header: "Nhóm", cell: (row) => row.categoryName ?? "—", hiddenOnMobile: true },
    { id: "uom", header: "ĐVT", accessor: "uomCode" },
    { id: "stock", header: "Tổng tồn", cell: (row) => number.format(row.totalOnHand), align: "right" },
    { id: "status", header: "Trạng thái", cell: (row) => badge(row.status) }
  ];
  return (
    <ListPageLayout>
      <DataSurface>
        <div className="data-surface__toolbar"><FilterBar actions={canManage ? <Link href="/warehouse/items/new"><Button leftIcon={<Plus size={16} />} variant="primary">Thêm hàng hóa</Button></Link> : undefined}>
          <SearchInput onChange={(event) => setSearch(event.target.value)} placeholder="Mã hoặc tên hàng" value={search} />
        </FilterBar></div>
        <DataTable ariaLabel="Danh sách hàng hóa" columns={columns} data={filtered} emptyDescription="" emptyTitle="Chưa có hàng hóa" error={error} getRowId={(row) => row.id} loading={loading} rowHrefPrefix="/warehouse/items/" />
      </DataSurface>
    </ListPageLayout>
  );
}

export function WarehouseListView(){const{data=[],error,loading}=useWarehouseData<Warehouse[]>("/api/v1/warehouses");const columns:DataTableColumn<Warehouse>[]=[{id:"code",header:"Mã kho",cell:(row)=><Link className="text-link" href={`/warehouse/warehouses/${row.id}`}>{row.code}</Link>},{id:"name",header:"Tên kho",accessor:"name"},{id:"type",header:"Loại",accessor:"type"},{id:"project",header:"Dự án / công trường",cell:(row)=>[row.projectName,row.worksiteName].filter(Boolean).join(" · ")||"—",hiddenOnMobile:true},{id:"manager",header:"Quản lý",cell:(row)=>row.managerName??"—",hiddenOnMobile:true},{id:"status",header:"Trạng thái",cell:(row)=>badge(row.status)}];return <DataTable columns={columns} data={data} emptyDescription="" emptyTitle="Chưa có kho" error={error} getRowId={(row)=>row.id} loading={loading}/>;}

export function DocumentListView({ type, canCreate = false }: { type: Exclude<InventoryDocumentType, "reversal">; canCreate?: boolean }) {
  const config = typeConfig[type];
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const url = `/api/v1/warehouse/${config.path}?limit=100`;
  const { data = [], error, loading } = useWarehouseData<InventoryDocument[]>(url);
  const filtered = useMemo(() => data.filter((row) => (!status || row.status === status) && (!search || row.documentNumber.toLowerCase().includes(search.toLowerCase()))), [data, search, status]);
  const warehouseColumns: DataTableColumn<InventoryDocument>[] = type === "receipt"
    ? [
        { id: "warehouse", header: "Kho", cell: (row) => row.targetWarehouseName ?? "—" },
        { id: "partner", header: "Nhà cung cấp / tham chiếu", cell: (row) => row.supplierReference ?? "—", hiddenOnMobile: true }
      ]
    : type === "issue"
      ? [
          { id: "warehouse", header: "Kho", cell: (row) => row.sourceWarehouseName ?? "—" },
          { id: "recipient", header: "Người nhận / mục đích", cell: (row) => row.recipient ?? row.receivingDepartment ?? "—", hiddenOnMobile: true }
        ]
      : [
          { id: "source", header: "Kho nguồn", cell: (row) => row.sourceWarehouseName ?? "—", hiddenOnMobile: true },
          { id: "target", header: "Kho đích", cell: (row) => row.targetWarehouseName ?? "—", hiddenOnMobile: true }
        ];
  const columns: DataTableColumn<InventoryDocument>[] = [
    { id: "number", header: "Số chứng từ", cell: (row) => <Link className="text-link" href={`/warehouse/${config.path}/${row.id}`}>{row.documentNumber}</Link> },
    { id: "date", header: "Ngày", accessor: "documentDate" },
    ...warehouseColumns,
    { id: "creator", header: "Người lập", cell: (row) => row.createdByName ?? "—", hiddenOnMobile: true },
    { id: "lines", header: "Số dòng", accessor: "lineCount", align: "right", hiddenOnMobile: true },
    { id: "quantity", header: "Tổng SL", cell: (row) => number.format(row.totalQuantity), align: "right" },
    { id: "status", header: "Trạng thái", cell: (row) => badge(row.status) }
  ];
  return (
    <ListPageLayout>
      <DataSurface>
        <div className="data-surface__toolbar"><FilterBar actions={canCreate ? <Link href={`/warehouse/${config.path}/new`}><Button leftIcon={<Plus size={16} />} variant="primary">Tạo {config.label.toLowerCase()}</Button></Link> : undefined}>
          <SearchInput onChange={(event) => setSearch(event.target.value)} placeholder="Số chứng từ" value={search} />
          <Select label="Trạng thái" onChange={(event) => setStatus(event.target.value)} options={Object.entries(statusLabels).filter(([key]) => ["draft", "submitted", "posted", "cancelled", "reversed"].includes(key)).map(([value, label]) => ({ value, label }))} placeholder="Tất cả" value={status} />
        </FilterBar></div>
        <DataTable ariaLabel={`Danh sách ${config.label.toLowerCase()}`} columns={columns} data={filtered} emptyDescription="" emptyTitle="Chưa có chứng từ" error={error} getRowId={(row) => row.id} loading={loading} rowHrefPrefix={`/warehouse/${config.path}/`} />
      </DataSurface>
    </ListPageLayout>
  );
}

export function InventoryView(){const[warehouseId,setWarehouseId]=useState(""),[search,setSearch]=useState("");const warehouses=useWarehouseData<Warehouse[]>("/api/v1/warehouses"),inventory=useWarehouseData<InventoryBalance[]>(`/api/v1/warehouse/inventory${warehouseId?`?warehouseId=${warehouseId}`:""}`);const filtered=(inventory.data??[]).filter((row)=>`${row.itemCode} ${row.itemName}`.toLowerCase().includes(search.toLowerCase()));const columns:DataTableColumn<InventoryBalance>[]=[{id:"warehouse",header:"Kho",cell:(row)=>`${row.warehouseCode} · ${row.warehouseName}`},{id:"item",header:"Hàng hóa",cell:(row)=><Link className="text-link" href={`/warehouse/items/${row.itemId}`}>{row.itemCode} · {row.itemName}</Link>},{id:"category",header:"Nhóm",cell:(row)=>row.categoryName??"—",hiddenOnMobile:true},{id:"stock",header:"Tồn",cell:(row)=>`${number.format(row.onHand)} ${row.uomCode}`,align:"right"},{id:"minimum",header:"Tồn tối thiểu",cell:(row)=>row.minimumStock===undefined?"—":number.format(row.minimumStock),align:"right",hiddenOnMobile:true},{id:"status",header:"Trạng thái",cell:(row)=>badge(row.status)}];return <ListPageLayout><DataSurface><div className="data-surface__toolbar"><FilterBar><SearchInput onChange={(event)=>setSearch(event.target.value)} placeholder="Mã hoặc tên hàng" value={search}/><Select label="Kho" onChange={(event)=>setWarehouseId(event.target.value)} options={(warehouses.data??[]).map((row)=>({value:row.id,label:`${row.code} · ${row.name}`}))} placeholder="Tất cả" value={warehouseId}/></FilterBar></div><DataTable columns={columns} data={filtered} emptyDescription="" emptyTitle="Chưa có số dư tồn kho" error={inventory.error||warehouses.error} getRowId={(row)=>`${row.warehouseId}-${row.itemId}`} loading={inventory.loading}/></DataSurface></ListPageLayout>;}

export function LedgerView(){const[warehouseId,setWarehouseId]=useState("");const warehouses=useWarehouseData<Warehouse[]>("/api/v1/warehouses"),ledger=useWarehouseData<StockLedgerEntry[]>(`/api/v1/warehouse/ledger?limit=200${warehouseId?`&warehouseId=${warehouseId}`:""}`);const columns:DataTableColumn<StockLedgerEntry>[]=[{id:"date",header:"Ngày",accessor:"postingDate"},{id:"document",header:"Chứng từ",cell:(row)=>row.documentNumber},{id:"warehouse",header:"Kho",accessor:"warehouseName"},{id:"item",header:"Hàng hóa",cell:(row)=>`${row.itemCode} · ${row.itemName}`},{id:"in",header:"Nhập",cell:(row)=>row.quantityIn?number.format(row.quantityIn):"—",align:"right"},{id:"out",header:"Xuất",cell:(row)=>row.quantityOut?number.format(row.quantityOut):"—",align:"right"},{id:"balance",header:"Tồn sau",cell:(row)=>`${number.format(row.runningBalance)} ${row.uomCode}`,align:"right"}];return <ListPageLayout><DataSurface><div className="data-surface__toolbar"><FilterBar><Select label="Kho" onChange={(event)=>setWarehouseId(event.target.value)} options={(warehouses.data??[]).map((row)=>({value:row.id,label:`${row.code} · ${row.name}`}))} placeholder="Tất cả" value={warehouseId}/></FilterBar></div><DataTable columns={columns} data={ledger.data??[]} emptyDescription="" emptyTitle="Chưa có bút toán kho" error={ledger.error||warehouses.error} getRowId={(row)=>row.id} loading={ledger.loading}/></DataSurface></ListPageLayout>;}

export function StockCountListView({canCreate=false}:{canCreate?:boolean}){const{data=[],error,loading}=useWarehouseData<StockCount[]>("/api/v1/warehouse/stock-counts");const columns:DataTableColumn<StockCount>[]=[{id:"number",header:"Số kiểm kê",cell:(row)=><Link className="text-link" href={`/warehouse/stock-counts/${row.id}`}>{row.countNumber}</Link>},{id:"date",header:"Ngày",accessor:"countDate"},{id:"warehouse",header:"Kho",accessor:"warehouseName"},{id:"policy",header:"Chính sách",cell:(row)=>row.transactionPolicy==="freeze"?"Khóa giao dịch":"Đối chiếu phát sinh"},{id:"status",header:"Trạng thái",cell:(row)=>badge(row.status)}];return <ListPageLayout><DataSurface><div className="data-surface__toolbar"><FilterBar actions={canCreate?<Link href="/warehouse/stock-counts/new"><Button leftIcon={<Plus size={16}/>} variant="primary">Tạo kiểm kê</Button></Link>:undefined}/></div><DataTable ariaLabel="Danh sách kiểm kê" columns={columns} data={data} emptyDescription="" emptyTitle="Chưa có phiên kiểm kê" error={error} getRowId={(row)=>row.id} loading={loading} rowHrefPrefix="/warehouse/stock-counts/"/></DataSurface></ListPageLayout>;}
