"use client";

import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { OfflineBanner } from "../components/OfflineBanner";

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  return isOffline;
}

export function NetworkStatusBanner() {
  const isOffline = useNetworkStatus();
  if (!isOffline) return null;
  return <OfflineBanner />;
}
