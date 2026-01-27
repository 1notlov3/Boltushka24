"use client";

import { useEffect, useState } from "react";
import { AudioConference, GridLayout, ControlBar, LiveKitRoom, ParticipantTile, VideoConference, useTracks, DisconnectButton, Chat, MediaDeviceSelect, TrackToggle } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
};

// Mock Track since livekit-client is not installed
const Track = {
  Source: {
    Camera: "camera" as any,
    Microphone: "microphone" as any,
    ScreenShare: "screen_share" as any,
  }
};

export const MediaRoom = ({
  chatId,
  video,
  audio
}: MediaRoomProps) => {
  const router = useRouter();
  const { user } = useUser();
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!user) return;

    const name = user.fullName || user.username || "User";

    (async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${chatId}&username=${name}`);
        const data = await resp.json();
        if(data.token) {
          setToken(data.token); // Ensure this is where you set the token state
        }
      } catch (e) {
        console.log(e);
      }
    })()
  }, [user, chatId]);

  if (!user || token === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2
          className="h-7 w-7 text-zinc-500 animate-spin my-4"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading...
        </p>
      </div>
    )
  }
  return (
    <LiveKitRoom
      data-lk-theme="default"
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      video={video}
      audio={audio}
     
    >
      
      <MyVideoConference/>
      <div className="flex  justify-center">
      <TrackToggle className="m-2 h-10" source={Track.Source.Microphone} />
      <TrackToggle className="m-2 h-10" source={Track.Source.Camera} />
      <DisconnectButton className="m-2 h-10" onClick = {()=>router.push(`/`)}>Выйти</DisconnectButton>
      
      </div>
      
      
      
    </LiveKitRoom>
  )
}

function MyVideoConference() {
  // `useTracks` returns all camera and screen share tracks. If a user
  // joins without a published camera track, a placeholder track is returned.
  
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(95vh - var(--lk-control-bar-height))' }}>
      {/* The GridLayout accepts zero or one child. The child is used
      as a template to render all passed in tracks. */}
      <ParticipantTile/>
      
    </GridLayout>
  );
}