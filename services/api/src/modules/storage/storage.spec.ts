import { StorageService } from "./storage.service";

const mockS3Send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((p: any) => ({ _type: "PUT", ...p })),
  DeleteObjectCommand: jest.fn().mockImplementation((p: any) => ({ _type: "DEL", ...p })),
  GetObjectCommand: jest.fn().mockImplementation((p: any) => ({ _type: "GET", ...p })),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: () => "test-uuid-1234",
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

describe("StorageService — upload", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts object with AES256 encryption and returns key and signed URL", async () => {
    mockS3Send.mockResolvedValue({});
    (getSignedUrl as jest.Mock).mockResolvedValue("https://signed.url/evidencias/e1/test-uuid-1234");
    const svc = new StorageService();
    const result = await svc.upload(Buffer.from("img-data"), "image/jpeg", "etapa-1");
    expect(result.key).toBe("evidencias/etapa-1/test-uuid-1234");
    expect(result.url).toBe("https://signed.url/evidencias/e1/test-uuid-1234");
    const putArg = (mockS3Send.mock.calls[0][0] as any);
    expect(putArg.ContentType).toBe("image/jpeg");
    expect(putArg.ServerSideEncryption).toBe("AES256");
    expect(putArg.Key).toBe("evidencias/etapa-1/test-uuid-1234");
  });
});

describe("StorageService — getSignedUrl", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns presigned URL with default 1h expiry", async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue("https://presigned.example.com/key");
    const svc = new StorageService();
    const url = await svc.getSignedUrl("evidencias/e1/uuid");
    expect(url).toBe("https://presigned.example.com/key");
    const [, , options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(options.expiresIn).toBe(3600);
  });

  it("allows overriding expiry duration", async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue("https://presigned.example.com/key");
    const svc = new StorageService();
    await svc.getSignedUrl("evidencias/e1/uuid", 7200);
    const [, , options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(options.expiresIn).toBe(7200);
  });
});

describe("StorageService — delete", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends DeleteObjectCommand with correct key", async () => {
    mockS3Send.mockResolvedValue({});
    const svc = new StorageService();
    await svc.delete("evidencias/e1/uuid");
    const delArg = (mockS3Send.mock.calls[0][0] as any);
    expect(delArg._type).toBe("DEL");
    expect(delArg.Key).toBe("evidencias/e1/uuid");
  });
});
