"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface PageHeaderState {
  title: string;
  subtitle?: string;
  screenCode?: string;
  badge?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  quickViews?: Array<{ label: string; href: string }>;
  views?: Array<{ label: string; active?: boolean; onClick?: () => void; href?: string }>;
}

interface PageHeaderContextValue {
  state: PageHeaderState;
  setHeader: (state: PageHeaderState) => void;
  resetHeader: () => void;
}

const defaultState: PageHeaderState = {
  title: "",
  subtitle: undefined,
};

const PageHeaderContext = React.createContext<PageHeaderContextValue>({
  state: defaultState,
  setHeader: () => {},
  resetHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [headerRecord, setHeaderRecord] = React.useState<{ path: string; state: PageHeaderState }>({
    path: pathname,
    state: defaultState,
  });

  const setHeader = React.useCallback(
    (newState: PageHeaderState) => {
      setHeaderRecord({ path: pathname, state: newState });
    },
    [pathname]
  );

  const resetHeader = React.useCallback(() => {
    setHeaderRecord({ path: pathname, state: defaultState });
  }, [pathname]);

  // Khi chuyển trang sang pathname mới, nếu state cũ chưa được trang mới ghi đè,
  // trả về defaultState để không bị hiện giật các nút hành động của trang trước
  const activeState = headerRecord.path === pathname ? headerRecord.state : defaultState;

  return (
    <PageHeaderContext.Provider value={{ state: activeState, setHeader, resetHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return React.useContext(PageHeaderContext);
}

export function useSetPageHeader(config: PageHeaderState, deps: any[] = []) {
  const { setHeader } = usePageHeader();

  React.useEffect(() => {
    setHeader(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
