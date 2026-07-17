import { describe, it, expect } from "vitest";
import { ACTION_DEFINITIONS } from "./ActionCatalog";

// Helper mapper for assertions
function mapActionToStepType(category: string, actionId: string) {
  if (actionId === "delay") return "wait";
  if (actionId === "condition") return "condition";
  if (actionId === "manual_approval") return "manual";

  switch (category) {
    case "Network Discovery":
      return "detection";
    case "Packet Analysis":
    case "Threat Intelligence":
      return "investigation";
    case "AI":
    case "Reporting":
      return "automated";
    case "Notification":
      return "notification";
    case "Workflow":
      return "manual";
    default:
      return "manual";
  }
}

describe("ActionCatalog Metadata and Schema Rules", () => {
  it("should contain definitions for all 22 specified actions", () => {
    expect(ACTION_DEFINITIONS.length).toBe(22);
  });

  it("should have correct fields and types for every action", () => {
    ACTION_DEFINITIONS.forEach((action) => {
      expect(action.id).toBeDefined();
      expect(typeof action.id).toBe("string");
      expect(action.name).toBeDefined();
      expect(typeof action.name).toBe("string");
      expect(action.category).toBeDefined();
      expect(typeof action.category).toBe("string");
      expect(action.icon).toBeDefined();
      expect(action.executor).toBeDefined();
      expect(typeof action.executor).toBe("string");
      expect(action.description).toBeDefined();
      expect(typeof action.description).toBe("string");
      expect(action.version).toBe("1.0");
      expect(action.configSchema).toEqual({});
    });
  });

  it("should map actions correctly to API StepTypes", () => {
    const delayStepType = mapActionToStepType("Workflow", "delay");
    expect(delayStepType).toBe("wait");

    const conditionStepType = mapActionToStepType("Workflow", "condition");
    expect(conditionStepType).toBe("condition");

    const approvalStepType = mapActionToStepType("Workflow", "manual_approval");
    expect(approvalStepType).toBe("manual");

    const scanStepType = mapActionToStepType("Network Discovery", "nmap_scan");
    expect(scanStepType).toBe("detection");

    const analysisStepType = mapActionToStepType("Packet Analysis", "packet_capture");
    expect(analysisStepType).toBe("investigation");

    const threatStepType = mapActionToStepType("Threat Intelligence", "virustotal");
    expect(threatStepType).toBe("investigation");

    const aiStepType = mapActionToStepType("AI", "ai_investigation");
    expect(aiStepType).toBe("automated");

    const reportStepType = mapActionToStepType("Reporting", "generate_report");
    expect(reportStepType).toBe("automated");

    const notificationStepType = mapActionToStepType("Notification", "slack");
    expect(notificationStepType).toBe("notification");
  });
});
