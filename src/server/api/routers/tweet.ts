import { string, z } from "zod";
import { createTRPCContext, createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { Prisma, PrismaClient } from '@prisma/client'
import { inferAsyncReturnType } from "@trpc/server";
const prisma = new PrismaClient()

export const tweetRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input: { content } }) => {
        const tweety =  await prisma.tweet.create({ data: { content, userId: ctx.session.user.id }})
        return tweety
  }),
  infiniteFeed: publicProcedure.input(
    z.object({
        onlyFollowing: z.boolean().optional(),
        limit: z.number().optional(), 
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
    })
  ).query(async ({ ctx, input: { limit = 10, cursor, onlyFollowing = false } }) => {
    const currentUserId = ctx.session?.user.id;

    return await getInfiniteTweets({
        ctx,
        cursor,
        limit,
        whereClause: currentUserId == null || !onlyFollowing ? undefined : { 
            user: {
                followers: { some: {id: currentUserId}}
            }
        }
    })
  }),
  toggleLike: protectedProcedure.input(z.object({id: string()})).mutation(async ({ ctx, input: { id } }) => {
    const data = {tweetId: id, userId: ctx.session.user.id}
    const existingLike = await prisma.like.findUnique({ where: {userId_tweetId: data}})
    if (existingLike == null) {
        await prisma.like.create({ data })
        return { addedLike: true }
    } else {
        await prisma.like.delete({ where: { userId_tweetId: data }})
        return { addedLike: false }
    }
  }),

  infiniteProfileFeed: publicProcedure.input(
    z.object({
        userId: z.string(),
        limit: z.number().optional(), 
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
    })
  ).query(async ({ ctx, input: { limit = 10, cursor, userId } }) => {
    return await getInfiniteTweets({
        ctx,
        cursor,
        limit,
        whereClause: { userId }
    })
  }),
});


async function getInfiniteTweets({
    whereClause,
    ctx,
    limit,
    cursor
}: {
    whereClause?: Prisma.TweetWhereInput,
    limit: number,
    cursor: {id: string, createdAt: Date} | undefined,
    ctx: inferAsyncReturnType<typeof createTRPCContext>
}) {
    const currentUserId = ctx.session?.user.id;
    
    const data = await prisma.tweet.findMany({
        take: limit + 1,
        cursor: cursor ? { createdAt_id: cursor } : undefined,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        where: whereClause,
        select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
                select: {
                    name: true,
                    id: true,
                    image: true
                }
            },
            _count: { select: { likes: true }},
            likes: currentUserId == null ? false : { where: {
                userId: currentUserId
            }}
        }
    })

    let nextCursor: typeof cursor | undefined
    if (data.length > limit) {
        const nextItem = data.pop();
        if (nextItem != null) {
            nextCursor = {id: nextItem.id, createdAt: nextItem.createdAt}
        }
    }

    return { tweets: data.map(tweet => {
        return {
            id: tweet.id,
            content: tweet.content,
            createdAt: tweet.createdAt,
            likeCount: tweet._count.likes,
            user: tweet.user,
            likeByMe: tweet.likes?.length > 0
        }
    }), nextCursor };
}