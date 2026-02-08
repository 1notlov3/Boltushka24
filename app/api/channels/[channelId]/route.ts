import { currentProfile } from "@/lib/current-profile";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MemberRole, ChannelType } from "@prisma/client";
import { z } from "zod";

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(100).refine((name) => name !== "основной", {
    message: "Название канала не может быть \"основной\""
  }).optional(),
  type: z.nativeEnum(ChannelType).optional()
});

const ParamsSchema = z.object({
  channelId: z.string().uuid("Invalid Channel ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

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

    const paramsValidation = ParamsSchema.safeParse(params);
    const queryValidation = QuerySchema.safeParse({ serverId });

    if (!paramsValidation.success) {
      return new NextResponse(paramsValidation.error.errors[0].message, { status: 400 });
    }

    if (!queryValidation.success) {
      return new NextResponse(queryValidation.error.errors[0].message, { status: 400 });
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
              not: "основной",
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
    const body = await req.json();
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

    const paramsValidation = ParamsSchema.safeParse(params);
    const queryValidation = QuerySchema.safeParse({ serverId });

    if (!paramsValidation.success) {
      return new NextResponse(paramsValidation.error.errors[0].message, { status: 400 });
    }

    if (!queryValidation.success) {
      return new NextResponse(queryValidation.error.errors[0].message, { status: 400 });
    }

    const result = UpdateChannelSchema.safeParse(body);

    if (!result.success) {
      return new NextResponse(result.error.errors[0].message, { status: 400 });
    }

    const { name, type } = result.data;

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
                name: "основной",
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