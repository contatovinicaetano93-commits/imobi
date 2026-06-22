import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'api_version';

export function ApiVersion(version: string | number) {
  return SetMetadata(API_VERSION_KEY, version.toString());
}
