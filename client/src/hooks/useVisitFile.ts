import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ContentTypes, QueryKeys } from 'librechat-data-provider';
import type { TMessage, TMessageContentParts } from 'librechat-data-provider';

type ToolCallShape = {
  function?: { name?: string; arguments?: string };
  name?: string;
  args?: string | Record<string, unknown>;
};

function parseFilename(args: string | Record<string, unknown> | undefined): string | null {
  if (!args) {
    return null;
  }
  try {
    const parsed =
      typeof args === 'string'
        ? (JSON.parse(args) as Record<string, unknown>)
        : args;
    const filename = parsed['filename'];
    return typeof filename === 'string' ? filename : null;
  } catch {
    return null;
  }
}

function extractFilename(part: TMessageContentParts | undefined): string | null {
  if (!part || part.type !== ContentTypes.TOOL_CALL) {
    return null;
  }
  const tc = part.tool_call as ToolCallShape;

  // FunctionToolCall format (plugins): { function: { name, arguments } }
  if (tc.function?.name === 'visit_file') {
    return parseFilename(tc.function.arguments);
  }

  // Agents.ToolCall format: { name, args }
  if (tc.name === 'visit_file') {
    return parseFilename(tc.args);
  }

  return null;
}

function findVisitFilename(messages: TMessage[] | undefined): string | null {
  if (!messages) {
    return null;
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const { content } = messages[i];
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content as (TMessageContentParts | undefined)[]) {
      const filename = extractFilename(part);
      if (filename) {
        return filename;
      }
    }
  }
  return null;
}

export function useVisitFile(conversationId: string | undefined): string | null {
  const queryClient = useQueryClient();

  const [filename, setFilename] = useState<string | null>(() =>
    findVisitFilename(
      queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]),
    ),
  );

  useEffect(() => {
    if (!conversationId) {
      setFilename(null);
      return;
    }

    setFilename(
      findVisitFilename(
        queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]),
      ),
    );

    return queryClient.getQueryCache().subscribe(() => {
      setFilename(
        findVisitFilename(
          queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]),
        ),
      );
    });
  }, [conversationId, queryClient]);

  return filename;
}
