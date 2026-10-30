import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gql } from "graphql-tag";
import { WclGraphQLClient, isRateLimitError } from "./wclGraphQLClient.js";
import type { OAuthTokenManager } from "../../utils/oauthTokenManager.js";

const DOC = gql`
  query Q {
    rateLimitData {
      limitPerHour
    }
  }
`;

const fetchMock = vi.fn();
const respond = (status: number, json: unknown = {}) =>
  fetchMock.mockResolvedValueOnce({ status, ok: status < 400, statusText: "", json: async () => json });

let client: WclGraphQLClient;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  client = new WclGraphQLClient({ getToken: async () => "t" } as unknown as OAuthTokenManager);
});
afterEach(() => vi.unstubAllGlobals());

describe("WclGraphQLClient.query", () => {
  it("sends the printed document and returns data", async () => {
    respond(200, { data: { rateLimitData: { limitPerHour: 1 } } });

    await expect(client.query(DOC, {})).resolves.toEqual({ data: { rateLimitData: { limitPerHour: 1 } } });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).query).toContain("rateLimitData");
  });

  it("opens the circuit on a 429 and short-circuits the next call", async () => {
    respond(429);

    const err = await client.query(DOC, {}).catch((e: unknown) => e);
    expect(isRateLimitError(err)).toBe(true);
    expect(client.isCircuitOpen()).toBe(true);

    await expect(client.query(DOC, {})).rejects.toSatisfy(isRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats an in-band rate-limit error as a 429", async () => {
    respond(200, { data: null, errors: [{ message: "You have hit your rate limit" }] });

    await expect(client.query(DOC, {})).rejects.toSatisfy(isRateLimitError);
    expect(client.isCircuitOpen()).toBe(true);
  });

  it("returns partial data alongside non-fatal errors", async () => {
    respond(200, { data: { x: 1 }, errors: [{ message: "restricted field" }] });

    await expect(client.query(DOC, {})).resolves.toEqual({ data: { x: 1 } });
    expect(client.isCircuitOpen()).toBe(false);
  });

  it("throws a plain error when errors come back without data", async () => {
    respond(200, { data: null, errors: [{ message: "bad query" }] });

    const err = await client.query(DOC, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(isRateLimitError(err)).toBe(false);
  });
});
