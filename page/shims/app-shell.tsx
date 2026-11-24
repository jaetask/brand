import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const Title = createContext<{ title: ReactNode; setTitle: (t: ReactNode) => void }>({
  title: null,
  setTitle: () => {},
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<ReactNode>(null);
  return <Title.Provider value={{ title, setTitle }}>{children}</Title.Provider>;
}

export const usePageTitle = () => useContext(Title).title;

export function useSetPageTitle(title: ReactNode) {
  const { setTitle } = useContext(Title);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
