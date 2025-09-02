import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("WebSocket message received:", message);

            // Handle different message types
            switch (message.type) {
              case "thread_created":
              case "thread_updated":
                // Invalidate threads list to refresh
                queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
                break;
              
              case "message_created":
                // Invalidate specific thread to refresh messages
                if (message.data?.threadId) {
                  queryClient.invalidateQueries({ queryKey: ["/api/threads", message.data.threadId] });
                }
                queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
                break;
              
              case "thread_voted":
                // Invalidate threads list and specific thread
                queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
                if (message.data?.thread?.id) {
                  queryClient.invalidateQueries({ queryKey: ["/api/threads", message.data.thread.id] });
                }
                break;
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...");
            connect();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };

      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        setIsConnected(false);
        
        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  return {
    isConnected,
    sendMessage,
  };
}