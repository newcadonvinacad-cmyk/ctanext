import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {auth} from '@/lib/auth';
import {productionReady} from '@/lib/production/context';
export const dynamic='force-dynamic';
export async function GET(){const s=await auth.api.getSession({headers:await headers()});if(!s?.user)return NextResponse.json({ready:false},{status:401});return NextResponse.json({ready:await productionReady()});}
