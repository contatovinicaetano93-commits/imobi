/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Bypass for Link and Image component type conflicts
declare namespace JSX {
  interface IntrinsicElements {
    nextlink?: any;
  }
}

declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next/image" {
  const Image: any;
  export default Image;
}
