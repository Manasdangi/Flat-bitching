import { createContext, useContext, type ReactNode } from "react";

const Embedded = createContext(false);

/** A collapsible tool. Inside a ToolGroup it renders as a plain titled section instead, so groups don't nest collapsibles. */
export function Tool({ title, children }: { title: ReactNode; children: ReactNode }) {
  const embedded = useContext(Embedded);
  return embedded
    ? <section className="tool-sec"><h4>{title}</h4>{children}</section>
    : <details className="tool"><summary>{title}</summary>{children}</details>;
}

/** One collapsible that holds several related tools. */
export function ToolGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="tool">
      <summary>{title}</summary>
      <div className="tool-body"><Embedded.Provider value={true}>{children}</Embedded.Provider></div>
    </details>
  );
}
