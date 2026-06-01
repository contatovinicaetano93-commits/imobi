// Global type definitions to handle Next.js component type compatibility issues

declare global {
  namespace React {
    // Extend React types to handle Next.js components
    type JSXElementConstructor<P> = ((props: P & { children?: ReactNode }) => ReactElement<any, any> | null) | (new (props: P & { children?: ReactNode }) => Component<any, any, any>);
  }
}

export {};
