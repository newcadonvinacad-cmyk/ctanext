"use client";

import * as React from "react";

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
  title: "Signage ERP",
  subtitle: "Hệ thống quản trị",
};

const PageHeaderContext = React.createContext<PageHeaderContextValue>({
  state: defaultState,
  setHeader: () => {},
  resetHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PageHeaderState>(defaultState);

  const setHeader = React.useCallback((newState: PageHeaderState) => {
    setState(newState);
  }, []);

  const resetHeader = React.useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ state, setHeader, resetHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return React.useContext(PageHeaderContext);
}

export function useSetPageHeader(config: PageHeaderState, deps: any[] = []) {
  const { setHeader, resetHeader } = usePageHeader();

  React.useEffect(() => {
    setHeader(config);
    return () => {
      // Optional cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
