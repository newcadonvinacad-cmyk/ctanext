import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { workflowContext, productionReady, WorkflowError, type WorkflowContext } from './context';
export async function workflowHttp(fn:(ctx:WorkflowContext)=>Promise<unknown>) {
  try {
    const session=await auth.api.getSession({headers:await headers()});
    if(!session?.user)throw new WorkflowError('Chưa xác thực',401);
    if(!await productionReady())throw new WorkflowError('Sản xuất chưa được khởi tạo; cần migration 019',503);
    const ctx=await workflowContext(session.user.id);
    return NextResponse.json(await fn(ctx));
  }catch(e:any){
    const status=e instanceof WorkflowError?e.status:400;
    return NextResponse.json({error:e.message || 'Không thể thực hiện thao tác'}, {status});
  }
}
