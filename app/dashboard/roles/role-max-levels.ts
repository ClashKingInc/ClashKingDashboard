type HallBuilding = "Town Hall" | "Builder Hall";

export async function loadRoleMaxLevels(
  request: (building: HallBuilding) => Promise<{ readonly max_level: number }>,
) {
  // These are independent controls: one unavailable building must not hide
  // the other building's successfully loaded levels.
  return Promise.allSettled([request("Town Hall"), request("Builder Hall")] as const);
}
