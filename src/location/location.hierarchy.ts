// src/location/location.hierarchy.ts
import { LocationType } from '@prisma/client';

export const ALLOWED_CHILDREN: Record<LocationType, LocationType[]> = {
  WAREHOUSE: ['ZONE'],
  ZONE: ['AISLE'],
  AISLE: ['RACK'],
  RACK: ['BIN'],
  BIN: [],
};

export function isChildTypeAllowed(parentType: LocationType, childType: LocationType) {
  return (ALLOWED_CHILDREN[parentType] || []).includes(childType);
}
