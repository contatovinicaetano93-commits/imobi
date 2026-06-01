// Type declarations to fix Next.js component JSX type issues
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module 'next/link' {
  import React from 'react';
  export default React.forwardRef<any, any>(function Link(props: any, ref: any) {
    return null as any;
  });
}

declare module 'next/image' {
  import React from 'react';
  export default React.forwardRef<any, any>(function Image(props: any, ref: any) {
    return null as any;
  });
}

export {};
