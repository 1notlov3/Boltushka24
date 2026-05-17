import { currentProfile } from "@/lib/current-profile";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChannelType } from "@prisma/client";
import { z } from "zod";
import { canManageChannels } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(100).refine((name) => name !== "основной", {
    message: "Название канала не может быть \"основной\""
  }).optional(),
  type: z.nativeEnum(ChannelType).optional(),
  topic: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(32).optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
  position: z.number().int().min(0).optional(),
  slowModeSeconds: z.number().int().min(0).max(21_600).optional(),
});

const ParamsSchema = z.object({
  channelId: z.string().uuid("Invalid Channel ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

export async function DELETE(
  req: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  try{
    const params = await context.params;
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

    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      include: {
        serverRoles: {
          include: {
            role: {
              select: { permissions: true },
            },
          },
        },
      },
    });

    if (!member) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!canManageChannels(member)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: paramsValidation.data.channelId,
        serverId,
        name: {
          not: "основной",
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const server = await db.server.update({
      where:{
        id:serverId,
      },
      data:{
        channels:{
          delete:{
            id: channel.id,
          }
        }
      }
    });

    await logAudit({
      action: "channel.delete",
      actorId: profile.id,
      serverId,
      targetId: channel.id,
      metadata: {
        name: channel.name,
        type: channel.type,
      },
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
  context: { params: Promise<{ channelId: string }> }
) {
  try{
    const params = await context.params;
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

    const { name, type, topic, icon, categoryId, position, slowModeSeconds } = result.data;

    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      include: {
        serverRoles: {
          include: {
            role: {
              select: { permissions: true },
            },
          },
        },
      },
    });

    if (!member) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!canManageChannels(member)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (categoryId) {
      const category = await db.channelCategory.findFirst({
        where: { id: categoryId, serverId },
        select: { id: true },
      });

      if (!category) {
        return new NextResponse("Category not found", { status: 404 });
      }
    }

    const server = await db.server.update({
      where:{
        id:serverId,
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
              topic: topic === undefined ? undefined : topic || null,
              icon: icon === undefined ? undefined : icon || null,
              categoryId: categoryId === undefined ? undefined : categoryId || null,
              position,
              slowModeSeconds,
            }
          }
        },
        auditLogs: {
          create: {
            action: "channel.update",
            actorId: profile.id,
            targetId: params.channelId,
            metadata: { name, type, topic, icon, categoryId, position, slowModeSeconds },
          },
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
