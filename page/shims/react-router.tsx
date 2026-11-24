import {
  type AnchorHTMLAttributes,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

const read = () => window.location.hash.replace(/^#/, "") || "/";
const subscribe = (on: () => void) => {
  window.addEventListener("hashchange", on);
  return () => window.removeEventListener("hashchange", on);
};

export function useHashLocation(): string {
  return useSyncExternalStore(subscribe, read, () => "/");
}

const split = (full: string) => {
  const q = full.indexOf("?");
  return q < 0
    ? { pathname: full, search: "" }
    : { pathname: full.slice(0, q), search: full.slice(q) };
};

const Params = createContext<Record<string, string>>({});
export function ParamsProvider({
  params,
  children,
}: {
  params: Record<string, string>;
  children: ReactNode;
}) {
  return <Params.Provider value={params}>{children}</Params.Provider>;
}

export function useParams<
  T extends Record<string, string | undefined> = Record<string, string>,
>(): T {
  return useContext(Params) as T;
}

export function useLocation() {
  const full = useHashLocation();
  return useMemo(() => ({ ...split(full), hash: "", state: null, key: full }), [full]);
}

export type To = string | { pathname?: string; search?: string };
const href = (to: To) =>
  typeof to === "string" ? to : `${to.pathname ?? split(read()).pathname}${to.search ?? ""}`;

export function navigate(to: To | number, options: { replace?: boolean } = {}) {
  if (typeof to === "number") {
    window.history.go(to);
    return;
  }
  const target = `#${href(to)}`;
  if (options.replace) window.location.replace(target);
  else window.location.hash = target;
}

export function useNavigate() {
  return useCallback(
    (to: To | number, options?: { replace?: boolean }) => navigate(to, options),
    [],
  );
}

export function useSearchParams(): [
  URLSearchParams,
  (
    next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void,
] {
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const set = useCallback(
    (
      next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const value =
        typeof next === "function"
          ? next(new URLSearchParams(split(read()).search))
          : new URLSearchParams(next as Record<string, string>);
      const s = value.toString();
      navigate(`${pathname}${s ? `?${s}` : ""}`, options);
    },
    [pathname],
  );
  return [params, set];
}

export function Navigate({ to, replace }: { to: To; replace?: boolean }) {
  useEffect(() => {
    navigate(to, { replace: replace ?? false });
  }, [to, replace]);
  return null;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: To;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
};
export function Link({ to, replace, state: _state, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={`#${href(to)}`}
      onClick={(e) => {
        onClick?.(e);
        if (replace && !e.defaultPrevented) {
          e.preventDefault();
          navigate(to, { replace: true });
        }
      }}
      {...rest}
    />
  );
}
