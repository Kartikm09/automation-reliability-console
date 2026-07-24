import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";

export function useRealtimeOrganization(): "connecting" | "live" | "offline" {
  const { session } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );

  useEffect(() => {
    if (!session?.access_token || !organization) {
      setStatus("offline");
      return;
    }
    setStatus("connecting");
    void supabase.realtime.setAuth(session.access_token);
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", organization.id],
      });
    };
    const topics = ["runs", "incidents", "approvals", "notifications"] as const;
    const liveTopics = new Set<string>();
    const channels = topics.map((topic) => {
      const channel = supabase.channel(`org:${organization.id}:${topic}`, {
        config: { private: true },
      });
      channel
        .on("broadcast", { event: "*" }, refresh)
        .subscribe((nextStatus) => {
          if (nextStatus === "SUBSCRIBED") {
            liveTopics.add(topic);
            if (liveTopics.size === topics.length) setStatus("live");
            refresh();
          } else if (
            nextStatus === "CHANNEL_ERROR" ||
            nextStatus === "TIMED_OUT"
          ) {
            setStatus("offline");
          } else {
            setStatus("connecting");
          }
        });
      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [organization, queryClient, session?.access_token]);

  return status;
}
