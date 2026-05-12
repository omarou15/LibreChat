import { useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { TooltipAnchor, Button, NewChatIcon } from '@librechat/client';
import { useLocalize, useNewConvo } from '~/hooks';
import { markNextConvoAsManual } from '~/data-provider';
import { clearMessagesCache, cn } from '~/utils';
import store from '~/store';
import VisitSetupModal from './VisitSetupModal';

export default function NewChat({ className }: { className?: string }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const setText = useSetRecoilState(store.textByIndex(0));
  const [modalOpen, setModalOpen] = useState(false);

  const clickHandler: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      window.open('/c/new', '_blank');
      return;
    }
    setModalOpen(true);
  };

  const handleVisitSubmit = ({ title, message }: { title: string; message: string }) => {
    if (title) markNextConvoAsManual();
    clearMessagesCache(queryClient, conversation?.conversationId);
    queryClient.invalidateQueries([QueryKeys.messages]);
    newConversation(title ? { template: { title } } : {});
    if (message) setText(message);
    setModalOpen(false);
  };

  return (
    <>
      <VisitSetupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleVisitSubmit}
      />
      <TooltipAnchor
        description={localize('com_ui_new_chat')}
        render={
          <Button
            size="icon"
            variant="outline"
            data-testid="new-chat-button"
            aria-label={localize('com_ui_new_chat')}
            className={cn(
              'size-9 rounded-xl bg-presentation duration-0 hover:bg-surface-active-alt max-md:hidden',
              className,
            )}
            onClick={clickHandler}
          >
            <NewChatIcon />
          </Button>
        }
      />
    </>
  );
}
