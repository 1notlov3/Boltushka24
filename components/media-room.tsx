"use client"
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Channel } from "@prisma/client";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
interface MediaRoomProps{
  chatid: string;
  video: boolean;
  audio: boolean;
};
export const MediaRoom = ({
chatid,
video,
audio
}:MediaRoomProps) => {
  const {user} = useUser();
  const {token,setToken} = useState("");
  useEffect(() => {
    if (!user?.firstName || !user?.lastName)
    return
  const name =`${user.firstName} ${user.lastName}`;
    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${chatid}&username=${name}`
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })()
  }, [user?.firstName,user?.lastName,chatid]);
  if (token === "") {
    return (
      <div>
        <Loader2/>
        <p>
          Loading...
        </p>
      </div>
    )
  }
  return(
    <LiveKitRoom serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      // Use the default LiveKit theme for nice styles.
      data-lk-theme="default"
      style={{ height: '100dvh' }}
      token={token}
      connect={true}
      video={video}
      audio={audio}
    >
      <VideoConference/>
    </LiveKitRoom>
  )
}