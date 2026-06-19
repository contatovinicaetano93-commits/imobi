import { HttpException, HttpStatus, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { ZodPipe } from "./pipes/zod.pipe";

// ─── HttpExceptionFilter ─────────────────────────────────────────────────────

function makeReply() {
  const reply = { code: jest.fn(), send: jest.fn() };
  reply.code.mockReturnValue(reply);
  return reply;
}

function makeHost(reply: ReturnType<typeof makeReply>) {
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
    }),
  } as any;
}

describe("HttpExceptionFilter", () => {
  const filter = new HttpExceptionFilter();

  it("returns correct status and message for HttpException with string response", () => {
    const reply = makeReply();
    filter.catch(new HttpException("Not Found", HttpStatus.NOT_FOUND), makeHost(reply));
    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Not Found" }),
    );
  });

  it("extracts message array from HttpException with object response", () => {
    const reply = makeReply();
    const exc = new BadRequestException(["field: required"]);
    filter.catch(exc, makeHost(reply));
    expect(reply.code).toHaveBeenCalledWith(400);
    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    expect(sent.message).toContain("field: required");
  });

  it("returns 500 with generic message for non-HttpException errors", () => {
    const reply = makeReply();
    filter.catch(new Error("DB connection lost"), makeHost(reply));
    expect(reply.code).toHaveBeenCalledWith(500);
    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    expect(sent.message).toBe("Erro interno do servidor");
  });

  it("includes timestamp in all responses", () => {
    const reply = makeReply();
    filter.catch(new HttpException("Forbidden", HttpStatus.FORBIDDEN), makeHost(reply));
    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    expect(typeof sent.timestamp).toBe("string");
    expect(new Date(sent.timestamp).getTime()).toBeGreaterThan(0);
  });
});

// ─── ZodPipe ─────────────────────────────────────────────────────────────────

describe("ZodPipe", () => {
  const schema = z.object({
    nome: z.string().min(2),
    idade: z.number().int().positive(),
  });

  const pipe = new ZodPipe(schema);

  it("returns parsed value when input is valid", () => {
    const result = pipe.transform({ nome: "João", idade: 30 });
    expect(result).toEqual({ nome: "João", idade: 30 });
  });

  it("throws BadRequestException when a required field is missing", () => {
    expect(() => pipe.transform({ nome: "João" })).toThrow(BadRequestException);
  });

  it("includes field path in the error message", () => {
    try {
      pipe.transform({ nome: "J", idade: -1 }); // nome too short, idade negative
      fail("Expected BadRequestException");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const response = (e as BadRequestException).getResponse() as Record<string, unknown>;
      const messages = response.message as string[];
      const paths = messages.map((m: string) => m.split(":")[0]);
      expect(paths).toContain("nome");
      expect(paths).toContain("idade");
    }
  });

  it("throws BadRequestException for completely invalid input", () => {
    expect(() => pipe.transform("not-an-object")).toThrow(BadRequestException);
  });
});
