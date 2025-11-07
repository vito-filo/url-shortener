import { createShortUrl, getLongUrl } from "./urlService";
import { Prisma } from "../generated/prisma/client";

// Mock the Prisma client
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    url: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Mock the hashUrl function to have predictable hashes
jest.mock("@/lib/hashUrl", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import hashUrl from "@/lib/hashUrl";
import prisma from "@/lib/prisma";

const mockHashUrl = hashUrl as jest.MockedFunction<typeof hashUrl>;
const mockCreate = prisma.url.create as jest.MockedFunction<
  typeof prisma.url.create
>;
const mockFindFirst = prisma.url.findFirst as jest.MockedFunction<
  typeof prisma.url.findFirst
>;
const mockFindUnique = prisma.url.findUnique as jest.MockedFunction<
  typeof prisma.url.findUnique
>;

describe("urlService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createShortUrl", () => {
    const origin = "https://short.ly";
    const longUrl = "https://example.com/very/long/url";
    const expectedHash = "abc123";

    it("should create a short URL successfully on first attempt", async () => {
      mockHashUrl.mockReturnValue(expectedHash);
      mockCreate.mockResolvedValue({
        id: 1,
        longUrl,
        hash: expectedHash,
        createdAt: new Date(),
      });

      const result = await createShortUrl(origin, longUrl);

      // Assert
      expect(result).toBe(`${origin}/${expectedHash}`);
      expect(mockHashUrl).toHaveBeenCalledWith(longUrl);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          longUrl,
          hash: expectedHash,
        },
      });
    });

    it("should return existing short URL when longUrl already exists in database", async () => {
      const existingHash = "existing123";
      mockHashUrl.mockReturnValue(expectedHash);

      // Simulate unique constraint violation
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        }
      );

      mockCreate.mockRejectedValue(prismaError);
      mockFindFirst.mockResolvedValue({
        id: 1,
        longUrl,
        hash: existingHash,
        createdAt: new Date(),
      });

      // Act
      const result = await createShortUrl(origin, longUrl);

      // Assert
      expect(result).toBe(`${origin}/${existingHash}`);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { longUrl },
      });
    });

    it("should handle hash collision by retrying with modified URL", async () => {
      // Arrange
      const firstHash = "collision123";
      const secondHash = "resolved456";

      mockHashUrl
        .mockReturnValueOnce(firstHash)
        .mockReturnValueOnce(secondHash);

      // First attempt: unique constraint violation, but no existing longUrl
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        }
      );

      mockCreate.mockRejectedValueOnce(prismaError).mockResolvedValueOnce({
        id: 2,
        longUrl,
        hash: secondHash,
        createdAt: new Date(),
      });

      mockFindFirst.mockResolvedValue(null);

      // Act
      const result = await createShortUrl(origin, longUrl);

      // Assert
      expect(result).toBe(`${origin}/${secondHash}`);
      expect(mockHashUrl).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Verify the second call used a modified URL (longUrl + random char)
      const secondCallArgs = mockHashUrl.mock.calls[1][0];
      expect(secondCallArgs).toMatch(
        new RegExp(`^${longUrl}[A-Za-z0-9\\-_\\.~]$`)
      );
    });

    it("should handle multiple hash collisions and eventually succeed", async () => {
      // Arrange
      const hashes = ["collision1", "collision2", "success123"];
      mockHashUrl
        .mockReturnValueOnce(hashes[0])
        .mockReturnValueOnce(hashes[1])
        .mockReturnValueOnce(hashes[2]);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        }
      );

      mockCreate
        .mockRejectedValueOnce(prismaError)
        .mockRejectedValueOnce(prismaError)
        .mockResolvedValueOnce({
          id: 3,
          longUrl,
          hash: hashes[2],
          createdAt: new Date(),
        });

      mockFindFirst.mockResolvedValue(null);

      // Act
      const result = await createShortUrl(origin, longUrl);

      // Assert
      expect(result).toBe(`${origin}/${hashes[2]}`);
      expect(mockHashUrl).toHaveBeenCalledTimes(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("should throw error after 3 failed attempts", async () => {
      // Arrange
      mockHashUrl.mockReturnValue("collision");

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        }
      );

      mockCreate.mockRejectedValue(prismaError);
      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(createShortUrl(origin, longUrl)).rejects.toThrow(
        "Failed to create a unique short URL after multiple attempts."
      );

      expect(mockHashUrl).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("should handle non-Prisma errors by rethrowing them", async () => {
      // Arrange
      mockHashUrl.mockReturnValue(expectedHash);
      const genericError = new Error("Database connection failed");
      mockCreate.mockRejectedValue(genericError);

      // Act & Assert
      await expect(createShortUrl(origin, longUrl)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle unknown Prisma error codes", async () => {
      // Arrange
      mockHashUrl.mockReturnValue(expectedHash);
      const unknownPrismaError = new Prisma.PrismaClientKnownRequestError(
        "Unknown error",
        {
          code: "P9999",
          clientVersion: "5.0.0",
        }
      );
      mockCreate.mockRejectedValue(unknownPrismaError);

      // Act & Assert
      await expect(createShortUrl(origin, longUrl)).rejects.toThrow(
        "Unknown error"
      );
    });
  });

  describe("getLongUrl", () => {
    const hash = "abc123";
    const longUrl = "https://example.com/very/long/url";

    it("should return long URL when hash exists", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        id: 1,
        longUrl,
        hash,
        createdAt: new Date(),
      });

      // Act
      const result = await getLongUrl(hash);

      // Assert
      expect(result).toBe(longUrl);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { hash },
      });
    });

    it("should return null when hash does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await getLongUrl(hash);

      // Assert
      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { hash },
      });
    });
  });
});
