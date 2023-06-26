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
  })
})