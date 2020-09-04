import { useEffect, useMemo, useCallback, useState } from 'react';
import { VideoTileState, DefaultMeetingSession } from 'amazon-chime-sdk-js';
import { useChimeDevices } from '@chime/devices';

type useChimeVideoProps = {
  meetingSession: DefaultMeetingSession;
  theirVideoRef: React.RefObject<HTMLVideoElement>;
  myVideoRef: React.RefObject<HTMLVideoElement>;
  autoStart?: boolean;

  // tileId: number;
  // observer: AudioVideoObserver;
};

const startVideo = async (
  meetingSession: DefaultMeetingSession,
  id: string | null
) => {
  if (id) {
    await meetingSession.audioVideo.chooseVideoInputDevice(id);
    meetingSession.audioVideo.startLocalVideoTile();
  }
};

export const useChimeVideo = ({
  meetingSession,
  theirVideoRef,
  myVideoRef,
  autoStart = true,
}: // tileId,
// observer,
useChimeVideoProps) => {
  const { currentVideoInputDeviceId } = useChimeDevices();
  const [isSharingVideo, setIsSharingVideo] = useState(autoStart);

  const toggleVideo = useCallback(async () => {
    if (isSharingVideo) {
      meetingSession.audioVideo.stopLocalVideoTile();
    } else {
      await startVideo(meetingSession, currentVideoInputDeviceId);
    }
    setIsSharingVideo((state: boolean) => !state);
  }, [currentVideoInputDeviceId, isSharingVideo, meetingSession]);

  // useEventListener('keydown', (ev: KeyboardEvent) => {
  //   if (ev.key === 'v' && ev.metaKey && ev.shiftKey) {
  //     toggleVideo();
  //     ev.preventDefault();
  //   }
  // });

  useEffect(() => {
    const theirVideoElement = theirVideoRef.current as HTMLVideoElement;
    const myVideoElement = myVideoRef.current as HTMLVideoElement;

    const observer = {
      // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
      videoTileDidUpdate: (tileState: VideoTileState) => {
        // Ignore a tile without attendee ID, and a content share.
        if (
          tileState.tileId === null ||
          !tileState.boundAttendeeId ||
          tileState.isContent
        ) {
          return;
        }

        meetingSession.audioVideo.bindVideoElement(
          tileState.tileId,
          tileState.localTile ? myVideoElement : theirVideoElement
        );
      },
    };

    const asyncFn = async () => {
      meetingSession.audioVideo.addObserver(observer);
      if (isSharingVideo) {
        await startVideo(meetingSession, currentVideoInputDeviceId);
      }
    };

    asyncFn();

    return () => {
      meetingSession.audioVideo.removeObserver(observer);
      meetingSession.audioVideo.stopLocalVideoTile();
    };
  }, [
    meetingSession,
    myVideoRef,
    theirVideoRef,
    currentVideoInputDeviceId,
    isSharingVideo,
  ]);

  const results = useMemo(
    () => ({
      isSharingVideo,
      toggle: toggleVideo,
    }),
    [isSharingVideo, toggleVideo]
  );

  return results;
};
