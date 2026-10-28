import { createContext, useContext } from "react";

/** Navigate to a route with the sand transition. */
export const SandNavContext = createContext<(to: string) => void>(() => {});
export const useSandNavigate = () => useContext(SandNavContext);
