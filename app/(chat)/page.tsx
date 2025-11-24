import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { IframeGuestAuth } from "@/components/iframe-guest-auth";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  // Check if this is an iframe embed context
  const headersList = await headers();
  const secFetchDest = headersList.get("sec-fetch-dest");
  const referer = headersList.get("referer");
  const isIframeContext = secFetchDest === "iframe" ||
                         (referer && referer.includes("easyfastnow.com"));

  // Only redirect to guest auth if not in iframe context
  if (!session && !isIframeContext) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
        <IframeGuestAuth />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie.value}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
      <IframeGuestAuth />
    </>
  );
}
