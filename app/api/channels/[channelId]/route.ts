import { currentProfile } from "@/lib/current-profile";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
export async function DELETE(
  req: Request,
  {params}: {params:{channelId:string}}
) {
  try{
    const {searchParams} = new URL(req.url);
    const serverId = searchParams.get('serverId');
    const profile= await currentProfile();
    if (!profile){
      return new NextResponse('Unauthorized', {status:401});
    }
    if (!serverId){
      return new NextResponse('Server id is missing', {status:400});
    }
    if (!params.channelId){
      return new NextResponse('Channel id is missing', {status:400});
    }

    const server = await db.server.update({
      where:{
        id:serverId,
        members: {
          some: {
            profileId: profile.id,
            role:{
              in: [MemberRole.ADMIN, MemberRole.MODERATOR ],
            }
          }
        }
      },
      data:{
        channels:{
          delete:{
            id:params.channelId,
            name:{
              not: "general",
            }
          }
        }
      }
    });
    return NextResponse.json(server);
  }
  catch(eror){
    console.log('CHANNEL_ID_DELETE',eror);
    return new NextResponse('Errror',{status:500});
  }
  
}
export async function PATCH(
  req: Request,
  {params}: {params:{channelId:string}}
) {
  try{
    const {searchParams} = new URL(req.url);
    const {name,type} = await req.json();
    const serverId = searchParams.get('serverId');
    const profile= await currentProfile();
    if (!profile){
      return new NextResponse('Unauthorized', {status:401});
    }
    if (!serverId){
      return new NextResponse('Server id is missing', {status:400});
    }
    if (!params.channelId){
      return new NextResponse('Channel id is missing', {status:400});
    }

    if (name === 'основной'){
      return new NextResponse('Название канала не может быть "основной"', {status:400});
    }

    const server = await db.server.update({
      where:{
        id:serverId,
        members: {
          some: {
            profileId: profile.id,
            role:{
              in: [MemberRole.ADMIN, MemberRole.MODERATOR ],
            }
          }
        }
      },
      data:{
        channels:{
          update:{
            where:{
              id: params.channelId,
              NOT:{
                name: 'основной',
              },
            },
            data:{
              name,
              type,
            }
          }
        }
      }
    });
    return NextResponse.json(server);
  }
  catch(eror){
    console.log('CHANNEL_ID_PATCH',eror);
    return new NextResponse('Errror',{status:500});
  }
  
}