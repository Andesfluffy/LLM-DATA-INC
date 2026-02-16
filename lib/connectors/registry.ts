import type { ConnectorFactory } from "./types";

const connectors = new Map<string, ConnectorFactory>();

export function registerConnector(factory: ConnectorFactory) {
  connectors.set(factory.type, factory);
}

export function getConnector(type: string): ConnectorFactory {
  const factory = connectors.get(type);
  if (!factory) {
    throw new Error(`Unknown connector type: "${type}". Available: ${[...connectors.keys()].join(", ")}`);
  }
  return factory;
}

export function listConnectorTypes(): Array<{ type: string; displayName: string; dialect: string }> {
  return [...connectors.values()].map((c) => ({
    type: c.type,
    displayName: c.displayName,
    dialect: c.dialect,
  }));
}
