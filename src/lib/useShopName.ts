import { useState, useEffect, useCallback } from "react";
import { getShopName, saveShopName as persistShopName } from "./shopStorage";

export function useShopName() {
  const [shopName, setShopNameState] = useState<string>(() => {
    try {
      return localStorage.getItem("metallurgist_shop_name") || "";
    } catch {
      return "";
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getShopName().then((name) => {
      if (isMounted) {
        setShopNameState(name);
        setIsLoading(false);
      }
    });

    const handleShopNameChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setShopNameState(customEvent.detail || "");
    };

    window.addEventListener("shopNameChanged", handleShopNameChange);
    return () => {
      isMounted = false;
      window.removeEventListener("shopNameChanged", handleShopNameChange);
    };
  }, []);

  const updateShopName = useCallback(async (newName: string) => {
    setShopNameState(newName);
    await persistShopName(newName);
  }, []);

  return { shopName, updateShopName, isLoading };
}
