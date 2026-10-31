import { describe, expect, it } from "vitest";
import { flowLevel } from "./useTrafficFlow";

describe("flowLevel", () => {
  it("maps ratio thresholds to levels", () => {
    expect(flowLevel(1)).toBe("free");
    expect(flowLevel(0.8)).toBe("free");
    expect(flowLevel(0.79)).toBe("slow");
    expect(flowLevel(0.6)).toBe("slow");
    expect(flowLevel(0.59)).toBe("congested");
    expect(flowLevel(0.35)).toBe("congested");
    expect(flowLevel(0.34)).toBe("jam");
    expect(flowLevel(0)).toBe("jam");
  });

  it("road closure always wins", () => {
    expect(flowLevel(1, true)).toBe("jam");
    expect(flowLevel(0.9, true)).toBe("jam");
  });

  it("is monotonic: slower ratio never yields a better level", () => {
    const order = ["jam", "congested", "slow", "free"];
    const rank = (l: string) => order.indexOf(l);
    let prev = rank(flowLevel(1));
    for (let r = 0.95; r >= 0; r -= 0.05) {
      const cur = rank(flowLevel(r));
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });
});
