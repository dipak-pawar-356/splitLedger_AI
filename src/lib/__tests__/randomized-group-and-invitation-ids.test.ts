import { describe, it, expect } from "vitest";
import { 
  generateGroupId, 
  generateInvitationToken, 
  generateInvitationId, 
  generateRandomNumericId,
  isDbIntegerId,
  generateInvitationUrl,
  generateGroupJoinUrl,
  PRODUCTION_APP_URL 
} from "@/lib/utils";

describe("Randomized 15-20 Digit Group & Invitation ID Engine", () => {
  it("Requirement 1: generateGroupId() produces randomized 15 to 20 digit numeric strings", () => {
    for (let i = 0; i < 50; i++) {
      const groupId = generateGroupId();
      
      // Must be entirely composed of digits
      expect(groupId).toMatch(/^\d+$/);
      // Length must be strictly between 15 and 20 digits (e.g., 16 digits)
      expect(groupId.length).toBeGreaterThanOrEqual(15);
      expect(groupId.length).toBeLessThanOrEqual(20);
      // First digit must be 1-9 (never starts with 0)
      expect(Number(groupId[0])).toBeGreaterThanOrEqual(1);
      expect(Number(groupId[0])).toBeLessThanOrEqual(9);
    }
  });

  it("Requirement 2: generateInvitationToken() produces randomized 15 to 20 digit numeric strings", () => {
    for (let i = 0; i < 50; i++) {
      const token = generateInvitationToken();
      
      // Must be entirely composed of digits
      expect(token).toMatch(/^\d+$/);
      // Length must be strictly between 15 and 20 digits
      expect(token.length).toBeGreaterThanOrEqual(15);
      expect(token.length).toBeLessThanOrEqual(20);
      // First digit must not be 0
      expect(Number(token[0])).toBeGreaterThanOrEqual(1);
    }
  });

  it("Requirement 3: Group ID and Invitation ID must ALWAYS be different from each other", () => {
    for (let i = 0; i < 100; i++) {
      const groupId = generateGroupId();
      const invitationToken = generateInvitationToken([groupId]);
      const invitationPublicId = generateInvitationId([groupId, invitationToken]);

      // None of the IDs should match each other
      expect(invitationToken).not.toBe(groupId);
      expect(invitationPublicId).not.toBe(groupId);
      expect(invitationPublicId).not.toBe(invitationToken);
    }
  });

  it("Requirement 4: All generated invitation IDs must be distinct from one another", () => {
    const tokens = new Set<string>();
    const count = 100;

    for (let i = 0; i < count; i++) {
      const token = generateInvitationToken();
      tokens.add(token);
    }

    // Every single generated invitation token is distinct
    expect(tokens.size).toBe(count);
  });

  it("Requirement 5: Unpredictability check - IDs must never be sequential (no 1, 2, ...)", () => {
    const id1 = generateGroupId();
    const id2 = generateGroupId();
    const id3 = generateGroupId();

    // Must not be sequential increments
    const diff1 = BigInt(id2) - BigInt(id1);
    const diff2 = BigInt(id3) - BigInt(id2);

    expect(diff1).not.toBe(BigInt(1));
    expect(diff1).not.toBe(BigInt(-1));
    expect(diff2).not.toBe(BigInt(1));
    expect(diff2).not.toBe(BigInt(-1));

    // Magnitude should be large and cryptographically spread out
    expect(diff1).not.toBe(BigInt(0));
    expect(diff2).not.toBe(BigInt(0));
  });

  it("Requirement 6: isDbIntegerId correctly differentiates internal DB 32-bit serial integers from 15-20 digit IDs", () => {
    // Internal small serial integers
    expect(isDbIntegerId(1)).toBe(true);
    expect(isDbIntegerId(7)).toBe(true);
    expect(isDbIntegerId("7")).toBe(true);
    expect(isDbIntegerId("1042")).toBe(true);

    // 15-20 digit randomized public IDs (must return FALSE to avoid SQL integer overflow)
    expect(isDbIntegerId("2095323857527914")).toBe(false);
    expect(isDbIntegerId("1224948725738448")).toBe(false);
    expect(isDbIntegerId(generateGroupId())).toBe(false);
    expect(isDbIntegerId(generateInvitationToken())).toBe(false);

    // Alphanumeric legacy IDs
    expect(isDbIntegerId("nBVOw3apMg9gFanB")).toBe(false);
    expect(isDbIntegerId("grp_Ibxni2c7qYNrl12H")).toBe(false);
  });

  it("Requirement 7: URLs generated for groups and invitations use 15-20 digit IDs and production domain", () => {
    const groupId = generateGroupId();
    const invitationToken = generateInvitationToken([groupId]);

    const groupUrl = generateGroupJoinUrl(groupId);
    const inviteUrl = generateInvitationUrl(invitationToken);

    expect(groupUrl).toBe(`${PRODUCTION_APP_URL}/join-group/${groupId}`);
    expect(inviteUrl).toBe(`${PRODUCTION_APP_URL}/join-group/${invitationToken}`);
    expect(groupUrl).not.toBe(inviteUrl);

    // Both URLs embed 15-20 digit numbers
    const extractedGroupId = groupUrl.split("/join-group/")[1];
    const extractedInviteToken = inviteUrl.split("/join-group/")[1];

    expect(extractedGroupId).toMatch(/^\d{15,20}$/);
    expect(extractedInviteToken).toMatch(/^\d{15,20}$/);
    expect(extractedGroupId).not.toBe(extractedInviteToken);
  });
});
