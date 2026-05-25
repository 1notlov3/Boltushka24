"use client"

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ModalType, useModal } from "@/hooks/use-modal-store";

const CreateServerModal = dynamic(() => import("@/components/modals/create-server-modal").then(mod => mod.CreateServerModal), { ssr: false });
const InviteModal = dynamic(() => import("@/components/modals/invite-modal").then(mod => mod.InviteModal), { ssr: false });
const EditServerModal = dynamic(() => import("@/components/modals/edit-server-modal").then(mod => mod.EditServerModal), { ssr: false });
const MembersModal = dynamic(() => import("@/components/modals/members-modal").then(mod => mod.MembersModal), { ssr: false });
const RolesModal = dynamic(() => import("@/components/modals/roles-modal").then(mod => mod.RolesModal), { ssr: false });
const ForwardMessageModal = dynamic(() => import("@/components/modals/forward-message-modal").then(mod => mod.ForwardMessageModal), { ssr: false });
const CreateChannelModal = dynamic(() => import("@/components/modals/create-channel-modal").then(mod => mod.CreateChannelModal), { ssr: false });
const CreateGroupConversationModal = dynamic(() => import("@/components/modals/create-group-conversation-modal").then(mod => mod.CreateGroupConversationModal), { ssr: false });
const GroupConversationSettingsModal = dynamic(() => import("@/components/modals/group-conversation-settings-modal").then(mod => mod.GroupConversationSettingsModal), { ssr: false });
const CreateCategoryModal = dynamic(() => import("@/components/modals/create-category-modal").then(mod => mod.CreateCategoryModal), { ssr: false });
const LeaveServerModal = dynamic(() => import("@/components/modals/leave-server-modal").then(mod => mod.LeaveServerModal), { ssr: false });
const DeleteServerModal = dynamic(() => import("@/components/modals/delete-server-modal").then(mod => mod.DeleteServerModal), { ssr: false });
const DeleteChannelModal = dynamic(() => import("@/components/modals/delete-channel-modal").then(mod => mod.DeleteChannelModal), { ssr: false });
const EditChannelModal = dynamic(() => import("@/components/modals/edit-channel-modal").then(mod => mod.EditChannelModal), { ssr: false });
const MessageFileModal = dynamic(() => import("@/components/modals/message-file-modal").then(mod => mod.MessageFileModal), { ssr: false });
const DeleteMessageModal = dynamic(() => import("@/components/modals/delete-message-modal").then(mod => mod.DeleteMessageModal), { ssr: false });
const MessageSearchModal = dynamic(() => import("@/components/modals/message-search-modal").then(mod => mod.MessageSearchModal), { ssr: false });
const PinnedMessagesModal = dynamic(() => import("@/components/modals/pinned-messages-modal").then(mod => mod.PinnedMessagesModal), { ssr: false });
const SavedMessagesModal = dynamic(() => import("@/components/modals/saved-messages-modal").then(mod => mod.SavedMessagesModal), { ssr: false });
const NotificationCenterModal = dynamic(() => import("@/components/modals/notification-center-modal").then(mod => mod.NotificationCenterModal), { ssr: false });
const UserSettingsModal = dynamic(() => import("@/components/modals/user-settings-modal").then(mod => mod.UserSettingsModal), { ssr: false });
const WatchTogetherModal = dynamic(() => import("@/components/modals/watch-together-modal").then(mod => mod.WatchTogetherModal), { ssr: false });
const UserRatingModal = dynamic(() => import("@/components/modals/user-rating-modal").then(mod => mod.UserRatingModal), { ssr: false });

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { type } = useModal();
  const [mountedModals, setMountedModals] = useState<Partial<Record<ModalType, boolean>>>({});

  useEffect(()=>{
    setIsMounted(true);
  },[]);

  useEffect(() => {
    if (type) {
      setMountedModals(prev => ({ ...prev, [type]: true }));
    }
  }, [type]);

  if(!isMounted){
    return null;
  }
  return (<>
    {mountedModals.createServer && <CreateServerModal/>}
    {mountedModals.invite && <InviteModal/>}
    {mountedModals.editServer && <EditServerModal />}
    {mountedModals.members && <MembersModal/>}
    {mountedModals.roles && <RolesModal/>}
    {mountedModals.forwardMessage && <ForwardMessageModal/>}
    {mountedModals.createChannel && <CreateChannelModal/>}
    {mountedModals.createGroupConversation && <CreateGroupConversationModal/>}
    {mountedModals.groupConversationSettings && <GroupConversationSettingsModal/>}
    {mountedModals.createCategory && <CreateCategoryModal/>}
    {mountedModals.leaveServer && <LeaveServerModal />}
    {mountedModals.deleteServer && <DeleteServerModal />}
    {mountedModals.deleteChannel && <DeleteChannelModal/>}
    {mountedModals.editChannel && <EditChannelModal/>}
    {mountedModals.messageFile && <MessageFileModal/>}
    {mountedModals.deleteMessage && <DeleteMessageModal/>}
    {mountedModals.messageSearch && <MessageSearchModal/>}
    {mountedModals.pinnedMessages && <PinnedMessagesModal/>}
    {mountedModals.savedMessages && <SavedMessagesModal/>}
    {mountedModals.notificationCenter && <NotificationCenterModal/>}
    {mountedModals.userSettings && <UserSettingsModal/>}
    {mountedModals.watchTogether && <WatchTogetherModal/>}
    {mountedModals.userRating && <UserRatingModal/>}
  </>
  )
}
