"use client";
import {useState,type FormEvent} from "react";import {KeyRound} from "lucide-react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/shared/Button";import {Input} from "@/components/shared/FormControls";
export function ChangePasswordForm(){const router=useRouter();const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const response=await fetch("/api/v1/auth/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")})});const body=await response.json() as{error?:{message?:string}};if(!response.ok){setError(body.error?.message||"Không thể đổi mật khẩu.");setBusy(false);return;}router.replace("/login");router.refresh();}
  if(!open)return <Button leftIcon={<KeyRound aria-hidden="true" size={16}/>} onClick={()=>setOpen(true)} variant="secondary">Đổi mật khẩu</Button>;
  return <form className="page-stack" onSubmit={submit}><Input autoComplete="current-password" label="Mật khẩu hiện tại" minLength={8} name="currentPassword" required type="password"/><Input autoComplete="new-password" label="Mật khẩu mới" minLength={12} name="newPassword" required type="password"/>{error?<p className="form-error" role="alert">{error}</p>:null}<div className="form-actions"><Button disabled={busy} onClick={()=>setOpen(false)}>Hủy</Button><Button disabled={busy} type="submit" variant="primary">Lưu mật khẩu</Button></div></form>;
}
