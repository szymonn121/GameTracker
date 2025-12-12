import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const FriendsController = {
  list: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const friends = await prisma.friend.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
      include: { user: { include: { profile: true } }, friend: { include: { profile: true } } }
    });
    res.json(
      friends.map((f) => ({
        id: f.id,
        displayName: f.userId === userId ? f.friend.profile?.displayName : f.user.profile?.displayName,
        since: f.since,
        status: 'active'
      }))
    );
  },
  sendRequest: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const requests = await prisma.friendRequest.findMany({ where: { toUserId: userId }, include: { fromUser: { include: { profile: true } } } });
    res.json(requests.map((r) => ({ id: r.id, from: { displayName: r.fromUser.profile?.displayName, email: r.fromUser.email }, status: r.status })));
  },
  request: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const { toUserId } = req.body;
    const created = await prisma.friendRequest.create({ data: { fromUserId: userId, toUserId } });
    res.json(created);
  },
  accept: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const fr = await prisma.friendRequest.update({ where: { id }, data: { status: 'ACCEPTED' } });
    await prisma.friend.create({ data: { userId: fr.fromUserId, friendId: fr.toUserId } });
    await prisma.friend.create({ data: { userId: fr.toUserId, friendId: fr.fromUserId } });
    res.json({ ok: true });
  },
  remove: async (req: AuthRequest, res: Response) => {
    const { friendId } = req.params;
    await prisma.friend.deleteMany({ where: { userId: req.user!.id, friendId } });
    await prisma.friend.deleteMany({ where: { userId: friendId, friendId: req.user!.id } });
    res.json({ ok: true });
  }
};
