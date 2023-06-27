import { string, z } from "zod";
import { createTRPCContext, createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { Prisma, PrismaClient } from '@prisma/client'
import { inferAsyncReturnType } from "@trpc/server";
const prisma = new PrismaClient()

export const profileRouter = createTRPCRouter({
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input: { id }, ctx }) => {
    const currentUserId = ctx.session?.user.id;
    const profile = await prisma.user.findUnique({ where: { id }, select: {
        name: true,
        image: true,
        followers: currentUserId == null ? undefined : { where: { id: currentUserId }},
        _count: {
            select: {
                followers: true,
                follows: true,
                tweets: true,
            }
        }
    }})

    if (profile == null) return 
    return {
        name: profile.name,
        image: profile.image,
        followersCount: profile._count.followers,
        followsCount: profile._count.follows,
        tweetsCount: profile._count.tweets,
        isFollowing: profile.followers.length > 0
    }
  }),
  toggleFollow: protectedProcedure.input(z.object({ userId: z.string() })).mutation(async ({ ctx, input: { userId }}) => {
    const currentUserId = ctx.session.user.id;

    const existingFollow = await prisma.user.findFirst({ where: { id: userId, followers: { some: { id: currentUserId }}}});

    let addedFollow
    if (existingFollow == null) {
        await prisma.user.update({
            where: { id: userId },
            data: { followers: { connect: { id: currentUserId }}}
        });
        addedFollow = true
    } else {
        await prisma.user.update({
            where: { id: userId },
            data: { followers: { disconnect: { id: currentUserId }}}
        });
        addedFollow = false
    }

    // Revalidate

    void ctx.revalidateSSG?.(`/profiles/${userId}`);
    void ctx.revalidateSSG?.(`/profiles/${currentUserId}`);

    return { addedFollow }
  })
})