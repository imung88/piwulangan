import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { serverT } from "@/lib/i18n/serverT";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const labels = {
    title: await serverT("notificationsPage.title"),
    desc: await serverT("notificationsPage.desc"),
  };

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const items = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="metro-page-title mb-1">{labels.title}</h1>
      <p className="text-metro-text-secondary mb-6">{labels.desc}</p>
      <NotificationsClient notifications={items} />
    </div>
  );
}
