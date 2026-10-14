import { BookingError } from "./bookings";

export type Resource = { id: string; name: string; active: boolean };
export type GetResource = (resourceId: string, authorization: string) => Promise<Resource>;

// Proposed contract with member3: GET /resources/:id -> 200 { resource: { id, name, active } } or 404.
// The caller's Bearer token is forwarded so Resource can apply its own access rules.
export function httpResourceLookup(resourceUrl: string, timeoutMs = 3000): GetResource {
  return async (resourceId, authorization) => {
    let response: Response;
    try {
      response = await fetch(`${resourceUrl}/resources/${encodeURIComponent(resourceId)}`, {
        headers: { Authorization: authorization }, signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BookingError(503, "RESOURCE_UNAVAILABLE");
    }
    if (response.status === 404) throw new BookingError(404, "RESOURCE_NOT_FOUND");
    if (!response.ok) throw new BookingError(503, "RESOURCE_UNAVAILABLE");
    try {
      const body: unknown = await response.json();
      const resource = body && typeof body === "object" && "resource" in body ? body.resource : undefined;
      if (!resource || typeof resource !== "object" || !("id" in resource) || resource.id !== resourceId ||
          !("active" in resource) || typeof resource.active !== "boolean") {
        throw new Error("Invalid Resource response");
      }
      const name = "name" in resource && typeof resource.name === "string" && resource.name.trim()
        ? resource.name.trim() : resourceId;
      return { id: resourceId, name, active: resource.active };
    } catch {
      throw new BookingError(503, "RESOURCE_UNAVAILABLE");
    }
  };
}
